import re
import urllib.parse
from datetime import datetime, timezone
from typing import Dict, Any, Optional
import httpx

# Known satire, parody, and entertainment faux-news domains
SATIRE_DOMAINS = {
    "theonion.com": "The Onion (Global Satire)",
    "babylonbee.com": "The Babylon Bee (US Satire)",
    "fakingnews.com": "Faking News (India Satire)",
    "clickhole.com": "ClickHole (Viral Satire)",
    "thedailymash.co.uk": "The Daily Mash (UK Satire)",
    "waterfordwhispersnews.com": "Waterford Whispers (Satire)",
    "thefauxy.com": "The Fauxy (India Satire/Parody)",
    "duffelblog.com": "Duffel Blog (Military Satire)",
    "borowitzreport.com": "The Borowitz Report (Satire)",
    "thebeaverton.com": "The Beaverton (Canada Satire)",
    "newsbiscuit.com": "NewsBiscuit (UK Satire)",
    "burrardstreetjournal.com": "Burrard Street Journal (Satire)",
}

# Credible wire agencies, government portals, and IFCN certified fact-checkers
TRUSTED_DOMAINS = {
    # Government & official
    "gov.in": "Government of India Official Portal",
    "nic.in": "National Informatics Centre (India)",
    "pib.gov.in": "Press Information Bureau (Govt of India)",
    "rbi.org.in": "Reserve Bank of India Official",
    "isro.gov.in": "ISRO Official Portal",
    "nasa.gov": "NASA Official Portal",
    "who.int": "World Health Organization",
    "un.org": "United Nations Official",
    "gov": "US Government Official TLD",
    # Wire Services
    "reuters.com": "Reuters News Agency (Primary Wire)",
    "apnews.com": "Associated Press (Primary Wire)",
    "ptinews.com": "Press Trust of India (PTI Wire)",
    "aninews.in": "Asian News International (ANI Wire)",
    "afp.com": "Agence France-Presse (AFP Wire)",
    # IFCN Certified Fact-Checkers
    "altnews.in": "Alt News (IFCN Certified Fact-Checker)",
    "boomlive.in": "BOOM Live (IFCN Certified Fact-Checker)",
    "snopes.com": "Snopes (IFCN Certified Fact-Checker)",
    "factly.in": "Factly (IFCN Certified Fact-Checker)",
    "vishvasnews.com": "Vishvas News (IFCN Certified Fact-Checker)",
    "thequint.com/news/webqoof": "Quint WebQoof (IFCN Fact-Checker)",
    "indiatoday.in/fact-check": "India Today Fact Check",
    "bbc.com/news/reality_check": "BBC Reality Check",
    "politifact.com": "PolitiFact (IFCN Certified)",
}

# Suspicious domain patterns / imitation TLDs
SUSPICIOUS_PATTERNS = [
    r"-news\.(xyz|top|biz|info|site|online)$",
    r"breaking.*?\.(xyz|pw|club)$",
    r"(bbc|cnn|ndtv|reuters)-.*?\.(com|net|org)$",  # Typosquats like bbc-breaking.com
    r"official-.*?\.(xyz|site)$"
]

def extract_domain(url: str) -> str:
    """Extracts the clean root domain from a given URL."""
    try:
        parsed = urllib.parse.urlparse(url if "://" in url else f"http://{url}")
        netloc = parsed.netloc.lower()
        # Remove port if present
        netloc = netloc.split(":")[0]
        # Remove www.
        if netloc.startswith("www."):
            netloc = netloc[4:]
        return netloc
    except Exception:
        return ""

def check_domain_reputation(url: str) -> Dict[str, Any]:
    """
    Analyzes domain reputation, checks satire lists, trusted sources,
    and queries RDAP (RFC 7482) for registration date and age.
    """
    domain = extract_domain(url)
    if not domain:
        return {
            "domain": "",
            "is_valid": False,
            "trust_score": 50,
            "is_satire": False,
            "is_trusted": False,
            "flags": ["Invalid URL format"]
        }

    flags = []
    is_satire = False
    satire_name = ""
    is_trusted = False
    trusted_name = ""

    # 1. Satire Check
    for sat_domain, name in SATIRE_DOMAINS.items():
        if domain == sat_domain or domain.endswith("." + sat_domain):
            is_satire = True
            satire_name = name
            flags.append(f"Known satire/parody publication: {name}")
            break

    # 2. Trusted / IFCN / Gov Check
    for trust_domain, name in TRUSTED_DOMAINS.items():
        if trust_domain in url.lower() or domain == trust_domain or domain.endswith("." + trust_domain):
            is_trusted = True
            trusted_name = name
            break

    # 3. Suspicious / Typosquatting Pattern Check
    for pattern in SUSPICIOUS_PATTERNS:
        if re.search(pattern, domain):
            flags.append("Domain matches known disposable or typosquatting pattern")

    # 4. Registration Age via RDAP (RFC 7482)
    registration_date: Optional[str] = None
    age_days: Optional[int] = None
    is_newly_registered = False

    try:
        # RDAP bootstrap endpoint for domain lookup
        rdap_url = f"https://rdap.org/domain/{domain}"
        with httpx.Client(timeout=3.5, follow_redirects=True) as client:
            resp = client.get(rdap_url)
            if resp.status_code == 200:
                rdap_data = resp.json()
                events = rdap_data.get("events", [])
                for ev in events:
                    if ev.get("eventAction") in ["registration", "created"]:
                        date_str = ev.get("eventDate")
                        if date_str:
                            registration_date = date_str
                            # Parse ISO format
                            clean_dt = date_str.replace("Z", "+00:00")
                            try:
                                reg_dt = datetime.fromisoformat(clean_dt)
                                now = datetime.now(timezone.utc)
                                age_days = (now - reg_dt).days
                                if age_days < 180:
                                    is_newly_registered = True
                                    flags.append(f"Domain registered recently ({age_days} days ago), high caution advised")
                            except Exception:
                                pass
                            break
    except Exception:
        # Fallback gracefully if RDAP times out or is blocked
        pass

    # Compute trust score (0 - 100)
    if is_satire:
        trust_score = 15
    elif is_trusted:
        trust_score = 95
    elif is_newly_registered:
        trust_score = 30
    elif flags:
        trust_score = 40
    else:
        trust_score = 70

    return {
        "domain": domain,
        "is_valid": True,
        "is_satire": is_satire,
        "satire_name": satire_name,
        "is_trusted": is_trusted,
        "trusted_name": trusted_name,
        "registration_date": registration_date,
        "domain_age_days": age_days,
        "is_newly_registered": is_newly_registered,
        "trust_score": trust_score,
        "flags": flags
    }
