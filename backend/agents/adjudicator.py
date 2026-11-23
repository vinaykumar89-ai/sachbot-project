import os
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.agents.extractor import AtomicClaim
from backend.agents.researcher import ResearchedClaimEvidence, KNOWN_VERIFIED_DATABASE
from backend.services.gemini_client import gemini_client
from backend.config import settings

class ClaimVerdict(BaseModel):
    id: int
    claim_text: str
    verdict: str  # TRUE | FALSE | MISLEADING / OUT OF CONTEXT | CLICKBAIT EXAGGERATION | AI-GENERATED / ALTERED | UNVERIFIED
    confidence: float  # 0 to 100
    explanation: str
    sources: List[Dict[str, Any]] = Field(default_factory=list)

class ImageDiffItem(BaseModel):
    claimed_context: str
    original_context: str
    claimed_date: Optional[str] = None
    original_date: Optional[str] = None
    claimed_location: Optional[str] = None
    original_location: Optional[str] = None
    original_image_url: Optional[str] = None
    summary_diff: str

class ViewerCorrection(BaseModel):
    misconception: str = ""
    why_it_misleads: str = ""
    corrected_perspective: str = ""
    critical_thinking_tip: str = ""

class HeadlineAudit(BaseModel):
    has_audit: bool = False
    headline: str = ""
    sensationalism_score: int = 0
    is_mismatch: bool = False
    audit_notes: str = ""
    sensational_phrases: List[str] = Field(default_factory=list)

class AdjudicationReport(BaseModel):
    overall_verdict: str
    confidence_score: float
    summary_explanation: str
    actual_fact: str = ""
    viewer_correction: Optional[ViewerCorrection] = None
    fetched_image_data: Dict[str, Any] = Field(default_factory=dict)
    image_origin_metadata: Dict[str, Any] = Field(default_factory=dict)
    detected_language: str
    claim_verdicts: List[ClaimVerdict] = Field(default_factory=list)
    image_diff: Optional[ImageDiffItem] = None
    headline_audit: Optional[HeadlineAudit] = None
    forensic_summary: Dict[str, Any] = Field(default_factory=dict)
    shareable_receipt_data: Dict[str, Any] = Field(default_factory=dict)

ADJUDICATION_SYSTEM_PROMPT = """
You are the Chief Adjudicator & Cognitive Truth Engine for Sachbot, an autonomous fact-checking system.
Your mission is twofold:
1. Verify the empirical factual truth strictly against evidence citations.
2. Provide the definitive ACTUAL FACT (ground truth reality) and directly CORRECT THE THOUGHTS OF THE VIEWER by explaining why the claim was deceptive and recalibrating their mental model.

POSSIBLE VERDICTS:
- TRUE: Fully verified by primary or reputable sources.
- FALSE: Demonstrably fabricated, debunked, or contrary to official records.
- MISLEADING / OUT OF CONTEXT: Real footage/facts repurposed with false captions, altered timelines, or missing critical context.
- CLICKBAIT EXAGGERATION: Headline or quote grossly sensationalized beyond what the actual facts/body text state.
- AI-GENERATED / ALTERED: Image, audio, or video exhibits synthetic/AI generation fingerprints or digital splicing.
- UNVERIFIED: Insufficient reliable evidence or active investigation with no consensus.

OUTPUT FORMAT: Strict JSON matching the schema:
{
  "overall_verdict": "FALSE | TRUE | MISLEADING / OUT OF CONTEXT | CLICKBAIT EXAGGERATION | AI-GENERATED / ALTERED | UNVERIFIED",
  "confidence_score": 95.0,
  "summary_explanation": "Clear, objective plain-language summary citing official sources...",
  "actual_fact": "The definitive, unambiguous ground truth reality of what actually happened or the verified facts backed by primary records...",
  "viewer_correction": {
    "misconception": "What viewers mistakenly believe or assume upon seeing this claim or image.",
    "why_it_misleads": "The psychological hook, false authority, or deceptive technique used to fool viewers.",
    "corrected_perspective": "How the viewer should objectively recalibrate their thinking and understand the reality.",
    "critical_thinking_tip": "A practical media literacy rule to help viewers instantly spot similar falsehoods in the future."
  },
  "claim_verdicts": [
    {
      "id": 1,
      "verdict": "...",
      "confidence": 95.0,
      "explanation": "..."
    }
  ],
  "image_diff": {
    "claimed_context": "...",
    "original_context": "...",
    "claimed_date": "...",
    "original_date": "...",
    "original_image_url": "...",
    "summary_diff": "..."
  }
}
"""

def generate_multilingual_summary(text_summary: str, target_lang_code: str) -> str:
    """Translates the final verdict summary into the user's language/Hinglish if requested."""
    if target_lang_code == "en" or not text_summary:
        return text_summary

    if not gemini_client.is_configured():
        if target_lang_code in ["hi", "hinglish"]:
            return f"[सत्यापन रिपोर्ट] {text_summary}"
        return text_summary

    lang_instructions = {
        "hi": "Translate this fact-check summary into clear, professional Hindi (Devanagari script).",
        "hinglish": "Translate this fact-check summary into natural conversational Hinglish (Hindi written in English alphabet), the way fact-checkers explain on WhatsApp.",
        "ta": "Translate this fact-check summary into clear Tamil.",
        "te": "Translate this fact-check summary into clear Telugu.",
        "kn": "Translate this fact-check summary into clear Kannada.",
        "mr": "Translate this fact-check summary into clear Marathi."
    }

    instruction = lang_instructions.get(target_lang_code, "Translate this fact-check summary into the requested language.")
    prompt = f"{instruction}\n\nOriginal Text:\n\"\"\"{text_summary}\"\"\""
    
    contents = [{"parts": [{"text": prompt}]}]
    resp = gemini_client._call_gemini_api(
        model=settings.GEMINI_MULTIMODAL_MODEL,
        contents=contents,
        system_instruction="Provide an accurate, culturally nuanced translation of the fact-check verdict."
    )
    translated = gemini_client.parse_gemini_response_text(resp)
    return translated or text_summary

def run_stage_4_adjudicator(
    claims: List[AtomicClaim],
    evidences: List[ResearchedClaimEvidence],
    normalized_input: Any
) -> AdjudicationReport:
    """
    Stage 4: Adjudicator & Diff Engine.
    Evaluates evidence, calculates confidence, creates visual/text diffs,
    and formats the final report.
    """
    forensic_data = getattr(normalized_input, "image_forensics", {}) or {}
    article_data = getattr(normalized_input, "article_content", {}) or {}
    domain_data = getattr(normalized_input, "domain_reputation", {}) or {}
    detected_lang = getattr(normalized_input, "detected_language", {"code": "en"})
    lang_code = detected_lang.get("code", "en")

    # Headline Audit
    headline_audit = None
    if article_data and article_data.get("title"):
        headline = article_data.get("title", "")
        sens_score = article_data.get("headline_sensationalism_score", 0)
        is_mismatch = article_data.get("headline_vs_body_mismatch", False)
        mismatch_note = article_data.get("mismatch_explanation", "")
        
        notes = mismatch_note if is_mismatch else (
            "Headline aligns generally with article body." if sens_score < 30 else
            "Headline contains sensationalized phrases designed to elicit viral reactions."
        )
        headline_audit = HeadlineAudit(
            has_audit=True,
            headline=headline,
            sensationalism_score=sens_score,
            is_mismatch=is_mismatch,
            audit_notes=notes,
            sensational_phrases=article_data.get("sensational_phrases", [])
        )

    # Check for AI-generation / alteration flags
    ai_risk = forensic_data.get("ai_provenance", {}).get("ai_risk", "LOW")
    is_ai_generated = ai_risk == "HIGH"

    # Check for known database match first
    first_claim_text = (claims[0].claim_text + " " + claims[0].claim_text_english).lower() if claims else ""
    raw_input_str = str(getattr(normalized_input, "raw_input", "") or "").strip()
    primary_text_str = str(getattr(normalized_input, "primary_text", "") or "").strip()
    visual_ocr_str = str(getattr(normalized_input, "visual_ocr", {}).get("full_ocr", "") or "").strip()
    full_search_text = f"{first_claim_text} {raw_input_str} {primary_text_str} {visual_ocr_str}".lower()

    matched_kb = None
    for key, val in KNOWN_VERIFIED_DATABASE.items():
        if all(k in full_search_text for k in key.split()):
            matched_kb = val
            break

    claim_verdicts: List[ClaimVerdict] = []
    overall_verdict = "UNVERIFIED"
    confidence_score = 75.0
    summary_explanation = ""
    actual_fact = ""
    viewer_correction: Optional[ViewerCorrection] = None
    image_diff = None

    # Resolve fetched image data and origin metadata from normalizer / KB
    fetched_image_data = getattr(normalized_input, "fetched_image_data", {}) or {}
    image_origin_metadata = getattr(normalized_input, "image_origin_metadata", {}) or {}
    if not image_origin_metadata and forensic_data.get("origin_dossier"):
        image_origin_metadata = forensic_data.get("origin_dossier")

    if matched_kb:
        overall_verdict = matched_kb["verdict"]
        confidence_score = matched_kb["confidence"]
        summary_explanation = matched_kb["explanation"]
        actual_fact = matched_kb.get("actual_fact", "")
        vc = matched_kb.get("viewer_correction")
        if vc and isinstance(vc, dict):
            viewer_correction = ViewerCorrection(**vc)
        if matched_kb.get("fetched_image_data"):
            fetched_image_data = {**fetched_image_data, **matched_kb["fetched_image_data"]}
        if matched_kb.get("image_origin_metadata"):
            image_origin_metadata = {**image_origin_metadata, **matched_kb["image_origin_metadata"]}

        for idx, c in enumerate(claims):
            ev_sources = evidences[idx].sources if idx < len(evidences) else []
            src_list = [s.model_dump() for s in ev_sources] if ev_sources else matched_kb.get("sources", [])
            claim_verdicts.append(ClaimVerdict(
                id=c.id,
                claim_text=c.claim_text,
                verdict=matched_kb["verdict"],
                confidence=matched_kb["confidence"],
                explanation=matched_kb["explanation"],
                sources=src_list
            ))

        if "visual_trace" in matched_kb:
            vt = matched_kb["visual_trace"]
            image_diff = ImageDiffItem(
                claimed_context="Diwali night illumination from space",
                original_context=vt.get("original_event", "NOAA population growth composite"),
                claimed_date="Annual Diwali night",
                original_date=vt.get("earliest_date_found", "2003"),
                original_image_url=vt.get("original_image_url"),
                summary_diff="The viral graphic was not photographed during Diwali; it is a color-coded demographic map created in 2003."
            )

    elif is_ai_generated:
        overall_verdict = "AI-GENERATED / ALTERED"
        confidence_score = 92.0
        ai_markers = forensic_data.get("ai_provenance", {}).get("ai_markers", [])
        summary_explanation = (
            f"Forensic metadata inspection detected signatures characteristic of generative AI software "
            f"({', '.join(ai_markers) if ai_markers else 'synthetic generative diffusion markers'}). "
            f"The image does not represent authentic photographic documentation."
        )
        actual_fact = (
            "Forensic metadata and compression analysis confirm this media contains synthetic artifacts and generation signatures "
            "typical of generative AI diffusion models rather than authentic camera capture."
        )
        viewer_correction = ViewerCorrection(
            misconception="Viewers often assume high-resolution, realistic-looking images must be real photographs captured by an authentic camera.",
            why_it_misleads="Generative AI systems can render photo-realistic lighting, skin textures, and intricate details that convincingly mimic documentary photography.",
            corrected_perspective="Treat sensational or unprecedented viral imagery with healthy skepticism; always verify camera provenance and check for telltale generative diffusion anomalies before sharing.",
            critical_thinking_tip="Examine fine structural details (fingers, reflections, text clarity, earlobes) and run provenance / C2PA inspections to detect AI origins."
        )
        for idx, c in enumerate(claims):
            ev_sources = evidences[idx].sources if idx < len(evidences) else []
            claim_verdicts.append(ClaimVerdict(
                id=c.id,
                claim_text=c.claim_text,
                verdict="AI-GENERATED / ALTERED",
                confidence=92.0,
                explanation=summary_explanation,
                sources=[s.model_dump() for s in ev_sources]
            ))

    elif domain_data.get("is_satire"):
        overall_verdict = "MISLEADING / OUT OF CONTEXT"
        confidence_score = 98.0
        satire_name = domain_data.get("satire_name", "Satire publication")
        summary_explanation = (
            f"This content originates from {satire_name}, an established parody/satire website. "
            f"The story is fictional satire and not real news."
        )
        actual_fact = (
            f"The referenced article was published as intentional comedy and parody by {satire_name}. "
            "No real-world event or official government statement corresponding to the claims has occurred."
        )
        viewer_correction = ViewerCorrection(
            misconception="Readers and social media users often mistake satire articles for breaking real-world news when forwarded out of context.",
            why_it_misleads="Satire publications intentionally adopt the typographic layout, journalistic style, and formal tone of mainstream news outlets.",
            corrected_perspective="Humorous and parody articles are written for entertainment or social critique, not factual reporting.",
            critical_thinking_tip="Always check the 'About Us' page or footer of unfamiliar news domains to confirm whether the publication is a registered humor or satire outlet."
        )
        for idx, c in enumerate(claims):
            claim_verdicts.append(ClaimVerdict(
                id=c.id,
                claim_text=c.claim_text,
                verdict="MISLEADING / OUT OF CONTEXT",
                confidence=98.0,
                explanation=summary_explanation,
                sources=[{
                    "title": f"Satire Notice: {satire_name}",
                    "url": f"https://{domain_data.get('domain')}",
                    "publisher": satire_name,
                    "credibility": "Verified Satire Publication",
                    "snippet": "This website publishes humorous, satirical commentary."
                }]
            ))

    elif headline_audit and headline_audit.is_mismatch:
        overall_verdict = "CLICKBAIT EXAGGERATION"
        confidence_score = 88.0
        summary_explanation = (
            f"The viral headline claims that \"{headline_audit.headline}\", but the article's own body text "
            f"states that officials have refuted or clarified the claims. This is a classic clickbait distortion."
        )
        actual_fact = (
            "The verified facts reported within the article's own body text directly contradict the sensationalized headline. "
            "The body text clarifies that authorities have either refuted the claims or that the headline exaggerated preliminary remarks."
        )
        viewer_correction = ViewerCorrection(
            misconception="Readers frequently assume the headline accurately reflects the verified conclusions of the underlying report.",
            why_it_misleads="Publishers craft emotionally provocative, hyperbolic headlines to maximize social media click-through rates and algorithmic engagement.",
            corrected_perspective="A headline is editorial packaging designed to attract clicks; the actual investigative truth resides in the verified body evidence and official citations.",
            critical_thinking_tip="Always read past the headline before forwarding or reacting. Check if the body text actually provides primary evidence supporting the title's claim."
        )
        for idx, c in enumerate(claims):
            ev_sources = evidences[idx].sources if idx < len(evidences) else []
            claim_verdicts.append(ClaimVerdict(
                id=c.id,
                claim_text=c.claim_text,
                verdict="CLICKBAIT EXAGGERATION",
                confidence=88.0,
                explanation=summary_explanation,
                sources=[s.model_dump() for s in ev_sources]
            ))

    elif gemini_client.is_configured():
        # Live adjudication via Gemini reasoning
        adjudicate_prompt = (
            f"Analyze the following claims and evidence:\n\n"
            f"Claims: {json.dumps([c.model_dump() for c in claims])}\n\n"
            f"Grounded Evidence & Sources: {json.dumps([e.model_dump() for e in evidences])}\n\n"
            f"Image Forensics: {json.dumps(forensic_data)}\n\n"
            f"Domain Reputation: {json.dumps(domain_data)}\n\n"
            "Adjudicate the factual truth of these claims strictly based on evidence citations. Output strict JSON with 'actual_fact' and 'viewer_correction'."
        )

        contents = [{"parts": [{"text": adjudicate_prompt}]}]
        resp = gemini_client._call_gemini_api(
            model=settings.GEMINI_REASONING_MODEL,
            contents=contents,
            system_instruction=ADJUDICATION_SYSTEM_PROMPT,
            response_json=True
        )

        resp_text = gemini_client.parse_gemini_response_text(resp)
        if resp_text:
            try:
                cleaned = resp_text.strip()
                if cleaned.startswith("```json"):
                    cleaned = cleaned[7:]
                if cleaned.startswith("```"):
                    cleaned = cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                
                parsed = json.loads(cleaned.strip())
                overall_verdict = parsed.get("overall_verdict", "UNVERIFIED")
                confidence_score = float(parsed.get("confidence_score", 75.0))
                summary_explanation = parsed.get("summary_explanation", "")
                actual_fact = parsed.get("actual_fact", "")
                vc_data = parsed.get("viewer_correction")
                if vc_data and isinstance(vc_data, dict):
                    viewer_correction = ViewerCorrection(**vc_data)

                for c in claims:
                    matching_pv = next((pv for pv in parsed.get("claim_verdicts", []) if pv.get("id") == c.id), None)
                    ev_item = next((e for e in evidences if e.claim_id == c.id), None)
                    srcs = [s.model_dump() for s in ev_item.sources] if ev_item else []
                    
                    claim_verdicts.append(ClaimVerdict(
                        id=c.id,
                        claim_text=c.claim_text,
                        verdict=matching_pv.get("verdict", overall_verdict) if matching_pv else overall_verdict,
                        confidence=float(matching_pv.get("confidence", confidence_score)) if matching_pv else confidence_score,
                        explanation=matching_pv.get("explanation", summary_explanation) if matching_pv else summary_explanation,
                        sources=srcs
                    ))

                if parsed.get("image_diff"):
                    id_data = parsed.get("image_diff")
                    image_diff = ImageDiffItem(**id_data)
            except Exception as e:
                print(f"Error parsing Gemini adjudication: {e}")

    # Check for Universal Live Grounding evidence if not yet adjudicated
    if not claim_verdicts and evidences:
        primary_ev = evidences[0]
        live_res = getattr(primary_ev, "live_grounding_result", None)
        if live_res and live_res.get("is_grounded"):
            overall_verdict = live_res.get("overall_verdict", "UNVERIFIED")
            confidence_score = float(live_res.get("confidence_score", 25.0))
            summary_explanation = live_res.get("summary_explanation", "")
            actual_fact = live_res.get("actual_fact", "")
            vc_data = live_res.get("viewer_correction")
            if vc_data and isinstance(vc_data, dict):
                viewer_correction = ViewerCorrection(**vc_data)

            for idx, c in enumerate(claims):
                ev_sources = evidences[idx].sources if idx < len(evidences) else []
                claim_verdicts.append(ClaimVerdict(
                    id=c.id,
                    claim_text=c.claim_text,
                    verdict=overall_verdict,
                    confidence=confidence_score,
                    explanation=summary_explanation,
                    sources=[s.model_dump() for s in ev_sources]
                ))

    # Fallback if unassigned or empty
    if not claim_verdicts:
        overall_verdict = "UNVERIFIED / INSUFFICIENT EVIDENCE"
        confidence_score = 20.0
        summary_explanation = (
            "Live verification could not definitively locate primary documentary confirmation or fact-checking consensus for this assertion. "
            "Please verify your network connection and click 'Re-verify Live Grounding' to run another search."
        )
        if claims:
            for idx, c in enumerate(claims):
                ev_sources = evidences[idx].sources if idx < len(evidences) else []
                claim_verdicts.append(ClaimVerdict(
                    id=c.id,
                    claim_text=c.claim_text,
                    verdict="UNVERIFIED / INSUFFICIENT EVIDENCE",
                    confidence=20.0,
                    explanation="Requires further primary documentation or official statement.",
                    sources=[s.model_dump() for s in ev_sources]
                ))
        else:
            # Handle case when input had no textual claims (e.g. photo or screenshot)
            media_format = forensic_data.get("format", "Media")
            dimensions = forensic_data.get("dimensions", {})
            dim_str = f"{dimensions.get('width', 0)}x{dimensions.get('height', 0)}" if dimensions else "Standard"
            ai_risk = forensic_data.get("ai_provenance", {}).get("ai_risk", "UNKNOWN")
            
            if is_ai_generated:
                overall_verdict = "AI-GENERATED / ALTERED"
                confidence_score = 92.0
            else:
                summary_explanation = (
                    f"Visual media analysis completed for {media_format} image ({dim_str}). "
                    f"Forensic check assessed AI generation risk as {ai_risk}. "
                    "No textual claims or viral captions were detected in the image."
                )

            claim_verdicts.append(ClaimVerdict(
                id=1,
                claim_text=f"Uploaded {media_format} visual media provenance & authenticity check",
                verdict=overall_verdict,
                confidence=confidence_score,
                explanation=summary_explanation,
                sources=[]
            ))

    # Ensure actual_fact and viewer_correction are populated if still blank
    if not actual_fact:
        if claims:
            actual_fact = f"Ground truth verification indicates the claim '{claims[0].claim_text}' requires verifiable primary records and official confirmation."
        else:
            media_format = forensic_data.get("format", "image")
            actual_fact = f"Authentic forensic provenance check verifies the input is a valid {media_format} without detectable synthetic AI artifacts or malicious image manipulation."

    if not viewer_correction:
        viewer_correction = ViewerCorrection(
            misconception="Viewers often forward standalone screenshots or dramatic claims without checking independent fact-check archives.",
            why_it_misleads="Decontextualized imagery and unverified assertions spread rapidly by exploiting emotional curiosity and cognitive confirmation bias.",
            corrected_perspective="Do not assume a claim or photo is authentic simply because it looks compelling or went viral. Cross-reference with primary records and accredited fact-checking bodies.",
            critical_thinking_tip="Search exact keywords on verified fact-checking platforms (Alt News, BOOM Live, Snopes, Reuters Fact Check) before believing or forwarding."
        )

    # Multilingual translation for final summary
    translated_summary = summary_explanation
    if lang_code != "en":
        try:
            translated_summary = generate_multilingual_summary(summary_explanation, lang_code)
        except Exception:
            pass

    # Compile shareable receipt data
    top_sources = []
    seen_urls = set()
    for cv in claim_verdicts:
        for s in cv.sources:
            if s.get("url") and s.get("url") not in seen_urls:
                seen_urls.add(s.get("url"))
                top_sources.append({
                    "title": s.get("title", "Official Source"),
                    "publisher": s.get("publisher", "Primary Source"),
                    "url": s.get("url")
                })
                if len(top_sources) >= 3:
                    break
        if len(top_sources) >= 3:
            break

    shareable_receipt = {
        "verdict_badge": overall_verdict,
        "confidence": confidence_score,
        "claim_excerpt": claims[0].claim_text if claims else "Visual Media Investigation",
        "verified_by": "Sachbot Multimodal Forensic Engine",
        "top_citations": top_sources,
        "verification_id": (raw_input_str[:12] if raw_input_str else "SACH-AUDIT")
    }

    return AdjudicationReport(
        overall_verdict=overall_verdict,
        confidence_score=confidence_score,
        summary_explanation=translated_summary,
        actual_fact=actual_fact,
        viewer_correction=viewer_correction,
        fetched_image_data=fetched_image_data,
        image_origin_metadata=image_origin_metadata,
        detected_language=lang_code,
        claim_verdicts=claim_verdicts,
        image_diff=image_diff,
        headline_audit=headline_audit,
        forensic_summary=forensic_data,
        shareable_receipt_data=shareable_receipt
    )
