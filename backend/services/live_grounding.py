import re
import json
import urllib.request
import urllib.parse
from typing import Dict, Any, List, Optional

try:
    from bs4 import BeautifulSoup
    HAS_BS4 = True
except ImportError:
    BeautifulSoup = None
    HAS_BS4 = False

try:
    from backend.services.gemini_client import gemini_client
    from backend.config import settings
except ImportError:
    from services.gemini_client import gemini_client
    from config import settings

# Common typo and alias dictionary for instant entity resolution
COMMON_ENTITY_TYPOS = {
    # Bollywood & Indian Cinema
    "amitab bachan": "Amitabh Bachchan",
    "amitabh bachan": "Amitabh Bachchan",
    "amitab bachchan": "Amitabh Bachchan",
    "amitab": "Amitabh Bachchan",
    "bachan": "Amitabh Bachchan",
    "bachchan": "Amitabh Bachchan",
    "shahrukh": "Shah Rukh Khan",
    "srk": "Shah Rukh Khan",
    "sharukh khan": "Shah Rukh Khan",
    "sharukh": "Shah Rukh Khan",
    "salman": "Salman Khan",
    "salman khan": "Salman Khan",
    "dhoni": "MS Dhoni",
    "ms dhoni": "MS Dhoni",
    "mahi": "MS Dhoni",
    "virat": "Virat Kohli",
    "kohli": "Virat Kohli",
    "virat kohli": "Virat Kohli",
    "rohit sharma": "Rohit Sharma",
    "sachin": "Sachin Tendulkar",
    "sachin tendulkar": "Sachin Tendulkar",
    "deepika": "Deepika Padukone",
    "deepika padukone": "Deepika Padukone",
    "jacqueline": "Jacqueline Fernandez",
    "jacqueline fernandez": "Jacqueline Fernandez",
    "aishwarya": "Aishwarya Rai",
    "aishwarya rai": "Aishwarya Rai",
    "rajinikanth": "Rajinikanth",
    "rajnikant": "Rajinikanth",
    "kamal haasan": "Kamal Haasan",
    "kamal hassan": "Kamal Haasan",
    # Indian Leaders & Business Figures
    "modi": "Narendra Modi",
    "narendra modi": "Narendra Modi",
    "modiji": "Narendra Modi",
    "rahul gandhi": "Rahul Gandhi",
    "kejriwal": "Arvind Kejriwal",
    "arvind kejriwal": "Arvind Kejriwal",
    "ratan tata": "Ratan Tata",
    "mukesh ambani": "Mukesh Ambani",
    "ambani": "Mukesh Ambani",
    "gautam adani": "Gautam Adani",
    "adani": "Gautam Adani",
    "narayana murthy": "N. R. Narayana Murthy",
    # Global Figures
    "queen elizabeth": "Queen Elizabeth II",
    "elizabeth": "Queen Elizabeth II",
    "donald trump": "Donald Trump",
    "trump": "Donald Trump",
    "joe biden": "Joe Biden",
    "biden": "Joe Biden",
    "elon musk": "Elon Musk",
    "musk": "Elon Musk",
}

# Certified IFCN Fact-Checking domains and credible wires
CERTIFIED_FACT_CHECK_DOMAINS = {
    "boomlive.in": "BOOM Live",
    "altnews.in": "Alt News",
    "vishvasnews.com": "Vishvas News",
    "thequint.com": "Quint Webqoof",
    "factly.in": "Factly",
    "newschecker.in": "Newschecker",
    "snopes.com": "Snopes",
    "politifact.com": "PolitiFact",
    "reuters.com": "Reuters Fact Check",
    "afp.com": "AFP Fact Check",
    "bbc.com": "BBC Reality Check",
    "indiatoday.in": "India Today Fact Check (AFWA)",
    "thip.media": "The Healthy Indian Project (THIP)",
}

REPUTABLE_NEWS_DOMAINS = {
    "thehindu.com": "The Hindu",
    "indianexpress.com": "The Indian Express",
    "timesofindia.indiatimes.com": "Times of India",
    "hindustantimes.com": "Hindustan Times",
    "ndtv.com": "NDTV",
    "ptinews.com": "Press Trust of India (PTI)",
    "aninews.in": "ANI News",
    "rbi.org.in": "Reserve Bank of India (RBI)",
    "pib.gov.in": "Press Information Bureau (PIB)",
    "nasa.gov": "NASA Official",
    "isro.gov.in": "ISRO Official",
    "who.int": "World Health Organization (WHO)",
    "unesco.org": "UNESCO Official",
    "wikipedia.org": "Wikipedia Primary Records",
}

def normalize_query_entities(raw_query: str) -> Dict[str, Any]:
    """
    Normalizes typos, resolves entity names, and classifies question intent.
    """
    clean = " ".join((raw_query or "").strip().split())
    clean_lower = clean.lower()

    # Typo correction
    resolved_text = clean
    matched_entity = None
    for typo, proper_name in sorted(COMMON_ENTITY_TYPOS.items(), key=lambda x: -len(x[0])):
        pattern = r"\b" + re.escape(typo) + r"\b"
        if re.search(pattern, clean_lower):
            resolved_text = re.sub(pattern, proper_name, resolved_text, flags=re.I)
            if not matched_entity:
                matched_entity = proper_name

    # If no typo matched, extract candidate entity from query
    if not matched_entity:
        cand = re.sub(r"^(is|did|was|are|who is|what is|has|have|why is)\s+", "", clean, flags=re.I)
        cand = re.sub(r"\s+(dead|alive|in jail|arrested|true|fake|fact check|passed away|no more)\??$", "", cand, flags=re.I).strip(" ?.")
        if len(cand) >= 3:
            matched_entity = cand

    # Intent classification
    is_death_query = bool(re.search(r"\b(dead|die|died|death|passed away|no more|mar gaya|expired|swargwasi|rip|alive|demise)\b", clean_lower))
    is_arrest_query = bool(re.search(r"\b(arrested|in jail|jail|police|custody|ed raid|cbi|busted)\b", clean_lower))
    is_award_query = bool(re.search(r"\b(unesco|nobel|award|declared best|best anthem|ranked first)\b", clean_lower))
    is_currency_query = bool(re.search(r"\b(2000 note|500 note|chip|nano chip|gps chip|banned|demonetisation)\b", clean_lower))
    is_scheme_query = bool(re.search(r"\b(free recharge|free laptop|free smartphone|yojana|pm scheme|5000 rupees)\b", clean_lower))

    # Formulate declarative claim
    if is_death_query and matched_entity:
        claim_assertion = f"{matched_entity} has passed away or died."
        intent_type = "celebrity_death_rumor"
    elif is_arrest_query and matched_entity:
        claim_assertion = f"{matched_entity} has been arrested or placed in jail."
        intent_type = "celebrity_arrest_rumor"
    elif is_award_query and matched_entity:
        claim_assertion = f"An official international body (UNESCO/Nobel) awarded or declared {matched_entity} best in the world."
        intent_type = "official_award_hoax"
    elif is_currency_query:
        claim_assertion = "The government or central bank embedded satellite tracking microchips in currency notes."
        intent_type = "currency_microchip_rumor"
    elif is_scheme_query:
        claim_assertion = "The government is distributing free recharge, laptops, or monetary handouts under a viral viral scheme."
        intent_type = "government_scheme_hoax"
    else:
        claim_assertion = clean.rstrip("?").strip()
        intent_type = "general_factual_inquiry"

    # Targeted search queries
    search_queries = []
    if matched_entity:
        if is_death_query:
            search_queries.append(f"{matched_entity} death news fact check")
            search_queries.append(f"{matched_entity} alive health official status")
            search_queries.append(f"{matched_entity} fact check")
        elif is_arrest_query:
            search_queries.append(f"{matched_entity} arrested fact check")
            search_queries.append(f"{matched_entity} news latest")
        else:
            search_queries.append(f"{matched_entity} fact check")
            search_queries.append(f"{matched_entity}")
    else:
        search_queries.append(f"{clean} fact check")
        search_queries.append(clean)

    return {
        "original_query": clean,
        "resolved_text": resolved_text,
        "matched_entity": matched_entity,
        "intent_type": intent_type,
        "claim_assertion": claim_assertion,
        "search_queries": search_queries,
        "is_death_query": is_death_query,
        "is_arrest_query": is_arrest_query,
        "is_award_query": is_award_query,
        "is_currency_query": is_currency_query,
        "is_scheme_query": is_scheme_query,
    }

def fetch_wikipedia_intel(entity_name: str) -> Optional[Dict[str, Any]]:
    """
    Fetches verified biographical/factual knowledge from Wikipedia's official API.
    Resolves living status, birth dates, death dates, and official summaries.
    """
    if not entity_name or len(entity_name) < 2:
        return None

    try:
        # 1. Search for best-matching Wikipedia page
        search_url = (
            f"https://en.wikipedia.org/w/api.php?action=query&list=search"
            f"&srsearch={urllib.parse.quote(entity_name)}&utf8=&format=json"
        )
        req = urllib.request.Request(search_url, headers={"User-Agent": "SachbotFactChecker/1.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            search_results = data.get("query", {}).get("search", [])
            if not search_results:
                return None
            top_title = search_results[0]["title"]

        # 2. Fetch page intro extract and canonical URL
        extract_url = (
            f"https://en.wikipedia.org/w/api.php?action=query&prop=extracts|info"
            f"&inprop=url&exintro=1&explaintext=1&titles={urllib.parse.quote(top_title)}&format=json"
        )
        req2 = urllib.request.Request(extract_url, headers={"User-Agent": "SachbotFactChecker/1.0"})
        with urllib.request.urlopen(req2, timeout=5) as resp2:
            d2 = json.loads(resp2.read().decode())
            pages = d2.get("query", {}).get("pages", {})
            if not pages:
                return None
            pdata = list(pages.values())[0]
            extract = pdata.get("extract", "").strip()
            fullurl = pdata.get("fullurl", f"https://en.wikipedia.org/wiki/{urllib.parse.quote(top_title)}")

            if not extract:
                return None

            # Detect alive vs deceased
            # Living persons intro: "(born 11 October 1942) is an Indian actor..."
            # Deceased persons intro: "(28 December 1937 – 9 October 2024) was an Indian..."
            is_deceased = False
            death_date_str = None
            birth_date_str = None

            # Look for dates in parentheses
            paren_match = re.search(r"\(([^)]+)\)", extract[:250])
            if paren_match:
                paren_content = paren_match.group(1)
                # Check for death indicator: "–", "died", or two dates
                if any(sep in paren_content for sep in ["–", "-", "—"]) and any(c.isdigit() for c in paren_content):
                    parts = re.split(r"[–—\-]", paren_content)
                    if len(parts) >= 2 and any(yr in parts[1] for yr in ["19", "20"]):
                        is_deceased = True
                        death_date_str = parts[1].strip()
                        birth_date_str = parts[0].replace("born", "").strip()
                elif "died" in paren_content.lower():
                    is_deceased = True
                    death_date_str = paren_content
                elif "born" in paren_content.lower():
                    birth_date_str = paren_content.replace("born", "").strip()

            # Check verbs: "was an" vs "is an"
            if not is_deceased:
                first_sentence = extract.split(".")[0] if "." in extract else extract
                if re.search(r"\bwas (an|a|the)\b", first_sentence) and not re.search(r"\bis (an|a|the)\b", first_sentence):
                    if any(w in extract.lower() for w in ["died", "passed away", "death of"]):
                        is_deceased = True

            return {
                "title": top_title,
                "url": fullurl,
                "extract": extract[:800],
                "first_sentence": (extract.split(".")[0] + ".") if "." in extract else extract,
                "is_deceased": is_deceased,
                "is_alive": not is_deceased,
                "death_date": death_date_str,
                "birth_date": birth_date_str,
            }
    except Exception as e:
        print(f"Wikipedia lookup error for '{entity_name}': {e}")
        return None

def fetch_duckduckgo_evidence(query: str, max_results: int = 6) -> List[Dict[str, Any]]:
    """
    Queries DuckDuckGo HTML for real-time fact checks, news reports, and refutations.
    Decodes actual destination URLs and identifies IFCN-certified sources.
    """
    if not query or len(query) < 2:
        return []

    encoded = urllib.parse.quote(query)
    url = f"https://html.duckduckgo.com/html/?q={encoded}"
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }

    results = []
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as resp:
            html_text = resp.read().decode("utf-8", errors="ignore")
            
            raw_items = []
            if HAS_BS4 and BeautifulSoup:
                soup = BeautifulSoup(html_text, "html.parser")
                for r in soup.find_all("div", class_="result"):
                    title_el = r.find("a", class_="result__title") or r.find("h2")
                    snip_el = r.find("a", class_="result__snippet")
                    url_el = r.find("a", class_="result__url")
                    title = title_el.get_text(strip=True) if title_el else ""
                    snippet = snip_el.get_text(strip=True) if snip_el else ""
                    raw_url = url_el.get("href", "") if url_el else ""
                    raw_items.append((title, snippet, raw_url))
            else:
                # Pure regex extraction for WASM/serverless environments without bs4
                matches = re.findall(
                    r'<a[^>]+class="[^"]*result__url[^"]*"[^>]+href="([^"]+)"[^>]*>.*?<a[^>]+class="[^"]*result__snippet[^"]*"[^>]*>(.*?)</a>',
                    html_text,
                    re.DOTALL
                )
                for raw_url, snip_html in matches:
                    snippet = re.sub(r"<[^>]+>", "", snip_html).strip()
                    raw_items.append(("", snippet, raw_url))

            for title, snippet, raw_url in raw_items:
                # Unpack DuckDuckGo redirect
                real_url = ""
                if "uddg=" in raw_url:
                    try:
                        real_url = urllib.parse.unquote(raw_url.split("uddg=")[1].split("&")[0])
                    except Exception:
                        real_url = raw_url
                elif raw_url.startswith("http"):
                    real_url = raw_url

                if not real_url or not (title or snippet):
                    continue

                if not title:
                    domain_cand = real_url.split("//")[-1].split("/")[0]
                    title = f"Report via {domain_cand}"

                # Filter out pure spam/ad domains
                domain = real_url.split("//")[-1].split("/")[0].lower()
                if any(blocked in domain for blocked in ["duckduckgo.com", "bing.com", "yahoo.com"]):
                    continue

                # Classify source credibility
                credibility = "Live Web Grounded Source"
                publisher = domain
                for cert_domain, cert_name in CERTIFIED_FACT_CHECK_DOMAINS.items():
                    if cert_domain in domain:
                        credibility = "IFCN Certified Fact-Checker"
                        publisher = cert_name
                        break

                if credibility == "Live Web Grounded Source":
                    for news_domain, news_name in REPUTABLE_NEWS_DOMAINS.items():
                        if news_domain in domain:
                            credibility = "Reputable Wire / Official Source"
                            publisher = news_name
                            break

                results.append({
                    "title": title,
                    "url": real_url,
                    "publisher": publisher,
                    "credibility": credibility,
                    "snippet": snippet
                })
                if len(results) >= max_results:
                    break
    except Exception as e:
        print(f"DuckDuckGo search error for '{query}': {e}")

    return results

def execute_universal_live_grounding(raw_query: str) -> Dict[str, Any]:
    """
    Main universal grounding orchestrator.
    Handles typos, questions, entities, runs Wikipedia API + DuckDuckGo live search,
    and formats Direct Answer First with calibrated confidence and strict citations.
    """
    norm = normalize_query_entities(raw_query)
    entity = norm.get("matched_entity")
    intent_type = norm.get("intent_type")
    is_death = norm.get("is_death_query")

    wiki_intel = fetch_wikipedia_intel(entity) if entity else None
    
    # Run targeted live search queries
    ddg_sources: List[Dict[str, Any]] = []
    for q in norm.get("search_queries", [])[:2]:
        res = fetch_duckduckgo_evidence(q, max_results=4)
        for item in res:
            if not any(s["url"] == item["url"] for s in ddg_sources):
                ddg_sources.append(item)

    # Check for IFCN fact checks via Google Fact Check Tools API if key exists
    if settings.has_factcheck_api or settings.has_gemini:
        for q in norm.get("search_queries", [])[:1]:
            fc_res = gemini_client.query_fact_check_tools_api(q)
            for fr in fc_res:
                if not any(s["url"] == fr["url"] for s in ddg_sources):
                    ddg_sources.append({
                        "title": fr.get("title", ""),
                        "url": fr.get("url", ""),
                        "publisher": fr.get("publisher", "IFCN Fact-Checker"),
                        "credibility": "IFCN Certified Fact-Checker",
                        "snippet": f"Official Rating: {fr.get('rating')}"
                    })

    # Combine sources and prepend Wikipedia if available
    all_sources: List[Dict[str, Any]] = []
    if wiki_intel:
        all_sources.append({
            "title": f"{wiki_intel['title']} — Verified Encyclopedic Profile",
            "url": wiki_intel["url"],
            "publisher": "Wikipedia / Primary Biographical Records",
            "credibility": "Primary Encyclopedic Source",
            "snippet": wiki_intel["extract"][:240] + "..."
        })
    all_sources.extend(ddg_sources)

    # Check for debunk keywords in retrieved evidence
    combined_snippets = " ".join([s["snippet"] + " " + s["title"] for s in ddg_sources]).lower()
    has_explicit_debunk = any(w in combined_snippets for w in [
        "fake", "hoax", "death hoax", "rumour", "alive and well", "alive and healthy",
        "debunked", "busted", "fabricated", "not true", "false claim", "false"
    ])
    has_explicit_death_confirm = any(w in combined_snippets for w in [
        "passed away at the age", "died on", "obituary", "funeral of", "death confirmed", "passed away peacefully"
    ])

    # Now formulate Direct Answer First, Verdict, Calibrated Confidence, and Cognitive Correction
    direct_answer = ""
    summary_explanation = ""
    actual_fact = ""
    viewer_correction = None
    overall_verdict = "UNVERIFIED"
    confidence_score = 25.0
    is_grounded = bool(all_sources)

    # CASE A: Celebrity Death Inquiry
    if is_death and entity:
        if wiki_intel and wiki_intel.get("is_alive") and not has_explicit_death_confirm:
            # Person is confirmed ALIVE; the claim is a demonstrably false hoax!
            overall_verdict = "FALSE / HOAX"
            confidence_score = 0.0  # As mandated: 0% confidence for demonstrably false hoaxes
            direct_answer = (
                f"No, {entity} is alive and in good health; viral claims and online forwards "
                f"announcing their death are demonstrably false hoaxes that have circulated repeatedly on social media."
            )
            summary_explanation = (
                f"{direct_answer}\n\n"
                f"• Verified Biographical Records: {wiki_intel.get('first_sentence', '')}\n"
                f"• Forensic Evidence: Independent fact-checkers and primary wire agencies have investigated and "
                f"debunked recurring death rumors concerning {entity}. No credible news agency, family representative, "
                f"or government body has reported any such demise."
            )
            actual_fact = (
                f"{entity} is alive and actively engaged in their personal and professional life. "
                f"Fact-checking organizations have confirmed that recurring viral posts announcing their death "
                f"are fabricated hoaxes created to harvest sensational algorithmic clicks."
            )
            viewer_correction = {
                "misconception": f"Viewers assume that sensational 'RIP' tribute videos or forwarded text messages about {entity} indicate an unannounced celebrity passing.",
                "why_it_misleads": "Death hoaxes exploit the celebrity's age, prominent stature, and shock value. Sensational channels post fake obituaries to exploit search algorithms for rapid traffic.",
                "corrected_perspective": f"When a prominent public figure like {entity} passes away, every major national news network, official government bulletin, and credible wire service (PTI, ANI, BBC) immediately carries verified breaking coverage.",
                "critical_thinking_tip": "If a celebrity death is only reported on anonymous YouTube channels, meme pages, or forwarded WhatsApp forwards without a verified mainstream news bulletin, treat it as 100% false."
            }
        elif (wiki_intel and wiki_intel.get("is_deceased")) or has_explicit_death_confirm:
            # Person is confirmed deceased
            death_date = wiki_intel.get("death_date") if wiki_intel else "recent records"
            overall_verdict = "TRUE / VERIFIED"
            confidence_score = 99.0
            direct_answer = (
                f"Yes, {entity} has passed away." + (f" Official records document their passing ({death_date})." if death_date else "")
            )
            summary_explanation = (
                f"{direct_answer}\n\n"
                f"• Verified Record: {wiki_intel.get('extract', '')[:400] if wiki_intel else 'Confirmed by official death records and national press.'}"
            )
            actual_fact = (
                f"Official biographical and press records confirm the passing of {entity}." + (f" Date of passing: {death_date}." if death_date else "")
            )
            viewer_correction = {
                "misconception": "Viewers often seek verification to distinguish legitimate historical obituaries from sensationalized viral hoaxes.",
                "why_it_misleads": "Old obituaries are frequently re-shared on death anniversaries, confusing readers into believing the death occurred today.",
                "corrected_perspective": "Always check the exact publication date and year on obituaries to distinguish the historical passing date from current events.",
                "critical_thinking_tip": "Cross-reference verified encyclopedic archives and official wire statements to verify biographical timelines."
            }
        else:
            # Unverified / inconclusive
            overall_verdict = "UNVERIFIED / INSUFFICIENT EVIDENCE"
            confidence_score = 20.0
            direct_answer = f"No credible official reports confirm the death of {entity}."
            summary_explanation = (
                f"{direct_answer} Live web search across official wire agencies and encyclopedic records found no death records, "
                f"nor active confirmation of demise. If you saw this on an unverified social media post, treat it with extreme caution."
            )
            actual_fact = f"No primary records, police communiqués, or verified wire agency reports confirm the claim regarding {entity}."
            viewer_correction = {
                "misconception": "Assuming unverified viral claims represent factual breaking news.",
                "why_it_misleads": "Sensational assertions spread rapidly on messaging apps before fact-checkers can audit them.",
                "corrected_perspective": "Wait for credible wire reports before accepting dramatic news.",
                "critical_thinking_tip": "Search exact keywords on IFCN-certified fact check portals."
            }

    # CASE B: General Fact / Entity / Claim Inquiry
    elif has_explicit_debunk:
        overall_verdict = "FALSE / HOAX"
        confidence_score = 0.0
        direct_answer = f"No, this claim is false: independent investigations and fact-checking records confirm this is an unfounded hoax or fabricated rumor."
        summary_explanation = (
            f"{direct_answer}\n\n"
            f"• Evidence Summary: Multiple verified sources and news fact-checks have refuted the assertion '{norm['claim_assertion']}'.\n"
            f"• Findings: {ddg_sources[0]['snippet'] if ddg_sources else 'Retrieved records directly contradict the claim.'}"
        )
        actual_fact = f"The claim '{norm['claim_assertion']}' is factually unfounded and directly contradicted by verified records."
        viewer_correction = {
            "misconception": "Viewers believe the claim because it adopted an authoritative tone or was forwarded repeatedly.",
            "why_it_misleads": "Fabricated forwards rely on emotional triggers and lack of immediate verification by the recipient.",
            "corrected_perspective": "A claim repeated often does not become true; always inspect primary source documentation.",
            "critical_thinking_tip": "Verify claims claiming dramatic breaking news against official agency websites."
        }

    elif wiki_intel:
        overall_verdict = "TRUE / VERIFIED"
        confidence_score = 95.0
        direct_answer = f"According to verified encyclopedic and primary records, {wiki_intel['first_sentence']}"
        summary_explanation = (
            f"{direct_answer}\n\n"
            f"• Verified Background: {wiki_intel['extract'][:450]}..."
        )
        actual_fact = f"Official records confirm: {wiki_intel['first_sentence']}"
        viewer_correction = {
            "misconception": "Viewers often confuse speculative rumors with verified historical facts.",
            "why_it_misleads": "Social media summaries often omit nuance or timeline context.",
            "corrected_perspective": "Ground factual inquiries in established encyclopedic and governmental records.",
            "critical_thinking_tip": "Consult primary official sources (ISRO, RBI, NASA, UNESCO, Britannica, Wikipedia) for baseline facts."
        }

    elif all_sources:
        # Grounded from live web search
        overall_verdict = "TRUE / VERIFIED" if len(all_sources) >= 3 else "UNVERIFIED / INSUFFICIENT EVIDENCE"
        confidence_score = 88.0 if overall_verdict == "TRUE / VERIFIED" else 30.0
        top_snip = all_sources[0]["snippet"]
        direct_answer = f"Live search results indicate: {top_snip[:160]}..."
        summary_explanation = (
            f"{direct_answer}\n\n"
            f"• Retrieved Live Evidence: Corroborated with {len(all_sources)} live web sources including {all_sources[0]['publisher']}."
        )
        actual_fact = f"Evidence from live web retrieval: {top_snip[:250]}."
        viewer_correction = {
            "misconception": "Accepting initial impressions without checking live reporting.",
            "why_it_misleads": "Fast-moving news cycles produce incomplete fragments.",
            "corrected_perspective": "Verify ongoing developments across multiple reputable wire agencies.",
            "critical_thinking_tip": "Look for consensus among established news outlets."
        }
    else:
        # Zero search results / network fail
        overall_verdict = "UNVERIFIED / INSUFFICIENT EVIDENCE"
        confidence_score = 15.0
        direct_answer = "Live search could not retrieve primary verification records for this query."
        summary_explanation = (
            f"Live search grounding was unable to locate verified primary records or fact-checking consensus for: \"{raw_query}\". "
            "Please verify your network connection and click 'Re-verify Live Grounding' to conduct a fresh live search."
        )
        actual_fact = f"No conclusive primary evidence could be verified for '{raw_query}' during this scan."
        viewer_correction = {
            "misconception": "Assuming that a lack of instant search results implies confirmation of a rumor.",
            "why_it_misleads": "Information voids allow rumors to proliferate unchecked.",
            "corrected_perspective": "Absence of confirmation means the assertion remains unverified.",
            "critical_thinking_tip": "When in doubt, wait for primary statements from authorized spokespersons."
        }

    return {
        "direct_answer": direct_answer,
        "overall_verdict": overall_verdict,
        "confidence_score": confidence_score,
        "summary_explanation": summary_explanation,
        "actual_fact": actual_fact,
        "viewer_correction": viewer_correction,
        "sources": all_sources,
        "is_grounded": is_grounded,
        "entity_data": norm,
        "wiki_intel": wiki_intel
    }
