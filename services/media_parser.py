import re
import urllib.parse
from typing import Dict, Any, Optional
import httpx

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    BeautifulSoup = None
    HAS_BS4 = False

try:
    import trafilatura
    HAS_TRAFILATURA = True
except ImportError:
    trafilatura = None
    HAS_TRAFILATURA = False

# Social media URL detection patterns
YOUTUBE_PATTERN = r"(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})"
TWITTER_PATTERN = r"(?:https?:\/\/)?(?:www\.)?(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)"
INSTAGRAM_PATTERN = r"(?:https?:\/\/)?(?:www\.)?instagram\.com\/(?:p|reel|tv)\/([a-zA-Z0-9_-]+)"
REDDIT_PATTERN = r"(?:https?:\/\/)?(?:www\.)?reddit\.com\/r\/([a-zA-Z0-9_]+)\/comments\/([a-zA-Z0-9]+)"

# Clickbait & sensationalism keywords common in viral headlines
CLICKBAIT_TRIGGERS = [
    "you won't believe", "shocking truth", "mind blown", "must watch",
    "destroyed in seconds", "secret leaked", "exposed", "doctors hate him",
    "what happened next will", "rbi secretly", "govt will ban", "miracle cure",
    "dhamaka", "sensation", "viral video reveals", "banned from tv",
    "nasa confirms", "unbelievable discovery"
]

def detect_url_type(url: str) -> str:
    """Identifies the platform or category of the link."""
    if re.search(YOUTUBE_PATTERN, url, re.IGNORECASE):
        return "youtube"
    elif re.search(TWITTER_PATTERN, url, re.IGNORECASE):
        return "twitter"
    elif re.search(INSTAGRAM_PATTERN, url, re.IGNORECASE):
        return "instagram"
    elif re.search(REDDIT_PATTERN, url, re.IGNORECASE):
        return "reddit"
    return "news_article"

def extract_article_content(url: str) -> Dict[str, Any]:
    """
    Downloads and extracts clean article text, metadata, headline,
    and conducts an initial headline vs. body discrepancy audit.
    """
    url_type = detect_url_type(url)
    result = {
        "url": url,
        "platform": url_type,
        "title": "",
        "author": "",
        "publish_date": "",
        "body_text": "",
        "summary": "",
        "headline_sensationalism_score": 0,
        "sensational_phrases": [],
        "headline_vs_body_mismatch": False,
        "mismatch_explanation": "",
        "success": False,
        "error": None
    }

    try:
        # Standard desktop user agent to avoid basic scrape blocks
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9,hi;q=0.8"
        }

        with httpx.Client(timeout=8.0, follow_redirects=True, headers=headers) as client:
            resp = client.get(url)
            if resp.status_code != 200:
                result["error"] = f"HTTP status {resp.status_code}"
                return result
            
            html = resp.text

        # Extract structured content using trafilatura if available
        extracted_text = ""
        metadata = None
        if HAS_TRAFILATURA and trafilatura:
            try:
                extracted_text = trafilatura.extract(
                    html,
                    include_comments=False,
                    include_tables=True,
                    no_fallback=False
                )
                metadata = trafilatura.extract_metadata(html)
            except Exception:
                extracted_text = ""

        # Title and body extraction
        title = ""
        if metadata and getattr(metadata, "title", None):
            title = metadata.title

        soup = None
        if HAS_BS4 and BeautifulSoup:
            soup = BeautifulSoup(html, "html.parser")
            if not title:
                if soup.title and soup.title.string:
                    title = soup.title.string.strip()
                elif soup.find("h1"):
                    title = soup.find("h1").get_text(strip=True)
        elif not title:
            # Simple regex title extraction
            t_match = re.search(r"<title[^>]*>(.*?)</title>", html, re.IGNORECASE | re.DOTALL)
            if t_match:
                title = re.sub(r"<[^>]+>", "", t_match.group(1)).strip()

        author = getattr(metadata, "author", "") if metadata else ""
        date = getattr(metadata, "date", "") if metadata else ""

        body = extracted_text or ""
        if not body:
            if soup:
                paragraphs = [p.get_text(strip=True) for p in soup.find_all("p") if len(p.get_text(strip=True)) > 25]
                body = "\n\n".join(paragraphs)
            else:
                raw_paras = re.findall(r"<p[^>]*>(.*?)</p>", html, re.IGNORECASE | re.DOTALL)
                clean_paras = [re.sub(r"<[^>]+>", "", p).strip() for p in raw_paras if len(p.strip()) > 25]
                body = "\n\n".join(clean_paras)

        result["title"] = title
        result["author"] = author
        result["publish_date"] = date
        result["body_text"] = body
        result["summary"] = body[:400] + "..." if len(body) > 400 else body
        result["success"] = bool(body or title)

        # Audit Headline vs Body for sensationalism & clickbait exaggeration
        if title:
            lower_title = title.lower()
            found_triggers = [trig for trig in CLICKBAIT_TRIGGERS if trig in lower_title]
            result["sensational_phrases"] = found_triggers
            
            # Punctuation markers: excessive exclamation marks or all-caps words
            exclamation_count = title.count("!")
            words = title.split()
            all_caps_words = [w for w in words if len(w) > 3 and w.isupper() and w.isalpha()]
            
            score = len(found_triggers) * 25 + (exclamation_count * 15) + (len(all_caps_words) * 10)
            result["headline_sensationalism_score"] = min(100, score)

            # Check if key sensational claims in title are absent or contradicted in the body
            if body:
                lower_body = body.lower()
                # If headline claims something banned or dead or secretly done, check if body softens it
                if any(k in lower_title for k in ["banned", "cancelled", "secret", "dies", "miracle cure"]):
                    if any(softener in lower_body for softener in ["rumors are false", "not true", "pib clarified", "clarification", "debunked", "no official announcement"]):
                        result["headline_vs_body_mismatch"] = True
                        result["mismatch_explanation"] = (
                            "The headline makes an alarming or definitive claim, but the article body reports that officials have denied or clarified it."
                        )

    except Exception as e:
        result["error"] = str(e)

    return result

def extract_social_media_info(url: str) -> Dict[str, Any]:
    """
    Extracts post info, captions, or oEmbed metadata for social links.
    """
    platform = detect_url_type(url)
    info = {
        "url": url,
        "platform": platform,
        "title": "",
        "caption": "",
        "author": "",
        "thumbnail_url": "",
        "embed_html": ""
    }

    try:
        if platform == "youtube":
            # YouTube oEmbed API (official & reliable)
            oembed_url = f"https://www.youtube.com/oembed?url={urllib.parse.quote(url)}&format=json"
            with httpx.Client(timeout=4.0) as client:
                res = client.get(oembed_url)
                if res.status_code == 200:
                    data = res.json()
                    info["title"] = data.get("title", "")
                    info["author"] = data.get("author_name", "")
                    info["thumbnail_url"] = data.get("thumbnail_url", "")
                    info["caption"] = f"YouTube video: {info['title']} by {info['author']}"
        elif platform == "twitter":
            # Twitter oEmbed API
            oembed_url = f"https://publish.twitter.com/oembed?url={urllib.parse.quote(url)}"
            with httpx.Client(timeout=4.0) as client:
                res = client.get(oembed_url)
                if res.status_code == 200:
                    data = res.json()
                    info["title"] = data.get("author_name", "X/Twitter Post")
                    info["author"] = data.get("author_name", "")
                    info["caption"] = BeautifulSoup(data.get("html", ""), "html.parser").get_text()
                    info["embed_html"] = data.get("html", "")
        else:
            # Fallback to article extraction
            art = extract_article_content(url)
            info["title"] = art.get("title", "")
            info["caption"] = art.get("body_text", "")[:500]
    except Exception:
        pass

    return info
