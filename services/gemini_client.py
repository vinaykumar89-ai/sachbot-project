import os
import json
import base64
from typing import Dict, Any, List, Optional
import httpx

try:
    from backend.config import settings
except ImportError:
    from config import settings

class GeminiClient:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.has_key = settings.has_gemini
        self.base_url = "https://generativelanguage.googleapis.com/v1beta"
        self.factcheck_key = settings.GOOGLE_FACTCHECK_API_KEY
        self.serpapi_key = settings.SERPAPI_KEY

    def is_configured(self) -> bool:
        return self.has_key

    def _call_gemini_api(
        self,
        model: str,
        contents: List[Any],
        system_instruction: Optional[str] = None,
        use_search_grounding: bool = False,
        response_json: bool = False
    ) -> Optional[Dict[str, Any]]:
        """Makes an authenticated call to the Gemini REST API."""
        if not self.has_key:
            return None

        endpoint = f"{self.base_url}/models/{model}:generateContent?key={self.api_key}"
        
        payload: Dict[str, Any] = {
            "contents": contents
        }

        if system_instruction:
            payload["systemInstruction"] = {
                "parts": [{"text": system_instruction}]
            }

        generation_config: Dict[str, Any] = {
            "temperature": 0.2,
            "maxOutputTokens": 2048,
        }

        if response_json:
            generation_config["responseMimeType"] = "application/json"

        payload["generationConfig"] = generation_config

        if use_search_grounding:
            # Enable Google Search Grounding tool
            payload["tools"] = [{"googleSearch": {}}]

        try:
            with httpx.Client(timeout=25.0) as client:
                resp = client.post(endpoint, json=payload)
                if resp.status_code == 200:
                    return resp.json()
                else:
                    print(f"Gemini API error ({resp.status_code}): {resp.text}")
                    return None
        except Exception as e:
            print(f"Gemini request exception: {e}")
            return None

    def query_fact_check_tools_api(self, query: str) -> List[Dict[str, Any]]:
        """
        Queries Google Fact Check Tools API for certified IFCN fact checks.
        """
        api_key = self.factcheck_key or self.api_key
        if not api_key or api_key == "your_factcheck_api_key_here":
            return []

        url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
        params = {
            "query": query,
            "key": api_key,
            "pageSize": 5,
            "languageCode": "en"
        }

        try:
            with httpx.Client(timeout=5.0) as client:
                res = client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    claims = data.get("claims", [])
                    results = []
                    for c in claims:
                        claim_reviews = c.get("claimReview", [])
                        for review in claim_reviews:
                            publisher = review.get("publisher", {}).get("name", "Unknown Fact-Checker")
                            site = review.get("publisher", {}).get("site", "")
                            rating = review.get("textualRating", "Unrated")
                            review_url = review.get("url", "")
                            title = review.get("title", c.get("text", query))
                            results.append({
                                "title": f"[{publisher}] {title}",
                                "url": review_url,
                                "publisher": publisher,
                                "site": site,
                                "rating": rating,
                                "credibility": "IFCN Certified Fact-Checker"
                            })
                    return results
        except Exception:
            pass
        return []

    def reverse_image_search_serpapi(self, image_url: str) -> List[Dict[str, Any]]:
        """Queries SerpAPI for Google Reverse Image search results."""
        if not self.serpapi_key or self.serpapi_key == "your_serpapi_key_here":
            return []

        url = "https://serpapi.com/search"
        params = {
            "engine": "google_reverse_image",
            "image_url": image_url,
            "api_key": self.serpapi_key
        }

        try:
            with httpx.Client(timeout=10.0) as client:
                res = client.get(url, params=params)
                if res.status_code == 200:
                    data = res.json()
                    image_results = data.get("image_results", [])
                    sources = []
                    for item in image_results[:5]:
                        sources.append({
                            "title": item.get("title", "Image Match"),
                            "url": item.get("link", ""),
                            "snippet": item.get("snippet", ""),
                            "source": item.get("source", ""),
                            "credibility": "Visual Match Source"
                        })
                    return sources
        except Exception:
            pass
        return []

    def parse_gemini_response_text(self, resp_data: Optional[Dict[str, Any]]) -> str:
        """Extracts text content and grounding metadata from Gemini response."""
        if not resp_data:
            return ""
        try:
            candidates = resp_data.get("candidates", [])
            if candidates:
                content = candidates[0].get("content", {})
                parts = content.get("parts", [])
                text_parts = [p.get("text", "") for p in parts if "text" in p]
                return "".join(text_parts)
        except Exception:
            pass
        return ""

    def extract_grounding_citations(self, resp_data: Optional[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extracts Google Search Grounding citations from Gemini candidates."""
        citations = []
        if not resp_data:
            return citations
        try:
            candidates = resp_data.get("candidates", [])
            if candidates:
                grounding_meta = candidates[0].get("groundingMetadata", {})
                chunks = grounding_meta.get("groundingChunks", [])
                for chunk in chunks:
                    web = chunk.get("web", {})
                    if web:
                        uri = web.get("uri", "")
                        title = web.get("title", uri)
                        if uri:
                            citations.append({
                                "title": title,
                                "url": uri,
                                "publisher": uri.split("//")[-1].split("/")[0],
                                "credibility": "Google Search Grounded Primary Source"
                            })
        except Exception:
            pass
        return citations

gemini_client = GeminiClient()
