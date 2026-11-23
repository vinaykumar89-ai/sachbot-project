import re
import json
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from backend.services.gemini_client import gemini_client
from backend.services.live_grounding import normalize_query_entities
from backend.config import settings

class AtomicClaim(BaseModel):
    id: int
    claim_text: str = Field(description="The exact factual assertion, cleaned and isolated")
    claim_text_english: str = Field(description="English translation for search grounding if original is non-English")
    claim_type: str = Field(description="statistic | quote | historical_event | policy_law | scientific_medical | media_attribution")
    search_queries: List[str] = Field(description="2-3 targeted fact-checking search queries")
    importance: str = Field(default="high", description="high | medium | low")

class ExtractionResult(BaseModel):
    claims: List[AtomicClaim] = Field(default_factory=list)
    filtered_opinions: List[str] = Field(default_factory=list, description="Subjective commentary or non-verifiable rhetoric that was ignored")
    context_summary: str = ""

EXTRACTION_SYSTEM_PROMPT = """
You are the Atomic Claim Extractor Agent for Sachbot, an autonomous fact-checking pipeline.
Your goal is to parse raw user text, social media forwards, article bodies, and OCR transcripts,
and extract discrete, independently verifiable factual claims.

RULES:
1. ONLY extract falsifiable claims containing dates, numbers, quotes, official actions, laws, scientific claims, or attributions.
2. DISCARD all subjective opinions, moral judgments, emotional complaints, and rhetorical questions into "filtered_opinions".
3. If the input is in Hindi, Hinglish, Tamil, Telugu, Kannada, or Bengali, provide both the original claim_text and an accurate claim_text_english for search grounding.
4. For each claim, formulate 2-3 precise, objective search queries optimized for primary sources (e.g. government portals, wire agencies PTI/Reuters, or IFCN fact-checkers).
5. Output strict valid JSON matching the schema.
"""

def fallback_claim_extraction(text: str) -> ExtractionResult:
    """
    Robust rule-based claim extraction when Gemini is not configured.
    Detects known viral hoaxes and breaks sentences down into testable claims.
    """
    lower = text.lower()
    claims: List[AtomicClaim] = []
    filtered: List[str] = []

    # Known viral forward patterns
    if "2000" in lower and any(k in lower for k in ["chip", "gps", "nano", "satellite"]):
        claims.append(AtomicClaim(
            id=1,
            claim_text="The Reserve Bank of India (RBI) Rs 2000 currency note contains a Nano GPS Chip (NGC) tracked by satellites.",
            claim_text_english="RBI 2000 rupee note nano GPS chip satellite tracking",
            claim_type="technology_policy",
            search_queries=[
                "RBI 2000 note nano GPS chip fact check",
                "Reserve Bank of India 2000 currency microchip official statement",
                "Alt News Boom Live 2000 note GPS chip debunked"
            ],
            importance="high"
        ))
    elif "diwali" in lower and any(k in lower for k in ["nasa", "satellite", "space"]):
        claims.append(AtomicClaim(
            id=1,
            claim_text="NASA released a satellite photograph showing India illuminated in brilliant colors on Diwali night.",
            claim_text_english="NASA satellite image India Diwali night real or fake",
            claim_type="scientific_media",
            search_queries=[
                "NASA satellite image India on Diwali night fact check",
                "NASA Earth Observatory India population lights composite"
            ],
            importance="high"
        ))
    elif any(k in lower for k in ["unesco", "national anthem", "best"]):
        claims.append(AtomicClaim(
            id=1,
            claim_text="UNESCO officially declared Jana Gana Mana as the best national anthem in the world.",
            claim_text_english="UNESCO declares Jana Gana Mana best national anthem world",
            claim_type="policy_award",
            search_queries=[
                "UNESCO best national anthem Jana Gana Mana fact check",
                "UNESCO official statement Indian national anthem"
            ],
            importance="high"
        ))
    else:
        # Use entity normalization and question intent formulation
        norm = normalize_query_entities(text)
        claim_assertion = norm.get("claim_assertion") or text.strip()
        search_queries = norm.get("search_queries") or [f"{text[:60]} fact check", f"{text[:50]} official verification"]
        
        claims.append(AtomicClaim(
            id=1,
            claim_text=claim_assertion,
            claim_text_english=claim_assertion,
            claim_type=norm.get("intent_type", "factual_statement"),
            search_queries=search_queries,
            importance="high"
        ))

        # Sentence splitting heuristics for multi-sentence inputs
        sentences = [s.strip() for s in re.split(r"[.\n!?।]+", text) if len(s.strip()) > 15]
        claim_id = 2
        for s in sentences[:3]:
            # Filter obvious questions or short exclamations or duplicate assertion
            if any(q in s.lower() for q in ["what do you think", "share this", "plz forward", "wake up india"]):
                filtered.append(s)
                continue
            if s.lower() in claim_assertion.lower() or claim_assertion.lower() in s.lower():
                continue
            claims.append(AtomicClaim(
                id=claim_id,
                claim_text=s,
                claim_text_english=s,
                claim_type="factual_statement",
                search_queries=[
                    f"{s[:60]} fact check",
                    f"{s[:50]} official verification"
                ],
                importance="medium"
            ))
            claim_id += 1

    return ExtractionResult(
        claims=claims or [
            AtomicClaim(
                id=1,
                claim_text=text[:120] if text else "Unspecified factual statement",
                claim_text_english=text[:120] if text else "Unspecified factual statement",
                claim_type="factual_statement",
                search_queries=[f"{text[:60]} fact check" if text else "fact check"],
                importance="high"
            )
        ],
        filtered_opinions=filtered,
        context_summary=text[:200]
    )

def run_stage_2_extractor(normalized_text: str, context_notes: str = "") -> ExtractionResult:
    """
    Stage 2: Extracts discrete atomic claims and constructs search queries.
    """
    if not normalized_text or not normalized_text.strip():
        return ExtractionResult()

    if not gemini_client.is_configured():
        return fallback_claim_extraction(normalized_text)

    prompt = (
        f"Context Notes: {context_notes}\n\n"
        f"Input Text to Extract Claims From:\n\"\"\"{normalized_text}\"\"\"\n\n"
        "Extract all atomic factual claims in strict JSON format according to the schema: "
        '{"claims": [{"id": 1, "claim_text": "...", "claim_text_english": "...", "claim_type": "...", "search_queries": ["...", "..."], "importance": "high"}], "filtered_opinions": ["..."], "context_summary": "..."}'
    )

    contents = [{"parts": [{"text": prompt}]}]
    
    resp = gemini_client._call_gemini_api(
        model=settings.GEMINI_MULTIMODAL_MODEL,
        contents=contents,
        system_instruction=EXTRACTION_SYSTEM_PROMPT,
        response_json=True
    )

    resp_text = gemini_client.parse_gemini_response_text(resp)
    if resp_text:
        try:
            # Clean possible markdown wrap
            cleaned = resp_text.strip()
            if cleaned.startswith("```json"):
                cleaned = cleaned[7:]
            if cleaned.startswith("```"):
                cleaned = cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            
            data = json.loads(cleaned.strip())
            claims_data = data.get("claims", [])
            claims = [AtomicClaim(**c) for c in claims_data]
            return ExtractionResult(
                claims=claims,
                filtered_opinions=data.get("filtered_opinions", []),
                context_summary=data.get("context_summary", "")
            )
        except Exception as e:
            print(f"Error parsing Gemini claim extraction JSON: {e}")

    # Fallback to rule-based if JSON parse fails
    return fallback_claim_extraction(normalized_text)
