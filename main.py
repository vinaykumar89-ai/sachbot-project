import sys
import os
import uuid
import shutil
import time
from typing import Optional, List

# Ensure current and parent directory are in Python search path for dual-mode execution
_current_dir = os.path.dirname(os.path.abspath(__file__))
_parent_dir = os.path.dirname(_current_dir)
if _current_dir not in sys.path:
    sys.path.insert(0, _current_dir)
if _parent_dir not in sys.path:
    sys.path.insert(0, _parent_dir)

from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import Response
from pydantic import BaseModel

try:
    from backend.config import settings
    from backend.services.cache_db import (
        generate_query_hash,
        get_cached_verification,
        save_verification,
        get_recent_history,
        get_verification_by_id,
        get_cache_stats
    )
    from backend.agents.normalizer import run_stage_1_normalizer
    from backend.agents.extractor import run_stage_2_extractor
    from backend.agents.researcher import run_stage_3_researcher
    from backend.agents.adjudicator import run_stage_4_adjudicator
    from backend.skills import skill_registry
    from backend.services.session_store import session_store
except ImportError:
    from config import settings
    from services.cache_db import (
        generate_query_hash,
        get_cached_verification,
        save_verification,
        get_recent_history,
        get_verification_by_id,
        get_cache_stats
    )
    from agents.normalizer import run_stage_1_normalizer
    from agents.extractor import run_stage_2_extractor
    from agents.researcher import run_stage_3_researcher
    from agents.adjudicator import run_stage_4_adjudicator
    from skills import skill_registry
    from services.session_store import session_store

app = FastAPI(
    title="Sachbot Fact-Checking API",
    description="Autonomous Multimodal AI Fact-Checking and Claim Verification Engine",
    version="1.0.0"
)

# Enable CORS dynamically for production and local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Safe mount uploads static directory if writable/available
try:
    if os.path.exists(settings.UPLOAD_DIR):
        app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
except Exception as e:
    print(f"Static uploads mount skipped: {e}")

# Frontend static build mounting if exists
frontend_dist = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
try:
    if os.path.exists(frontend_dist) and os.path.exists(os.path.join(frontend_dist, "assets")):
        app.mount("/assets", StaticFiles(directory=os.path.join(frontend_dist, "assets")), name="assets")
except Exception:
    pass

@app.get("/")
def read_root():
    if os.path.exists(frontend_dist):
        index_file = os.path.join(frontend_dist, "index.html")
        if os.path.exists(index_file):
            from fastapi.responses import FileResponse
            return FileResponse(index_file)
    return {
        "app": "Sachbot Fact-Checking API",
        "status": "online",
        "mode": settings.ENVIRONMENT,
        "version": "2.0.0",
        "gemini_active": settings.has_gemini,
        "docs": "/docs"
    }

@app.get("/api/health")
def health_check():
    stats = get_cache_stats()
    return {
        "status": "ok",
        "mode": settings.ENVIRONMENT,
        "gemini_configured": settings.has_gemini,
        "gemini_multimodal_model": settings.GEMINI_MULTIMODAL_MODEL,
        "gemini_reasoning_model": settings.GEMINI_REASONING_MODEL,
        "serpapi_configured": settings.has_serpapi,
        "factcheck_api_configured": settings.has_factcheck_api,
        "cache_stats": stats
    }

@app.get("/api/history")
def list_history(limit: int = Query(default=20, ge=1, le=100)):
    return get_recent_history(limit=limit)

@app.get("/api/history/{record_id}")
def get_history_record(record_id: str):
    rec = get_verification_by_id(record_id)
    if not rec:
        raise HTTPException(status_code=404, detail="Verification report not found")
    return rec

@app.get("/api/cache/stats")
def cache_statistics():
    return get_cache_stats()

@app.get("/api/skills")
def list_skills():
    """Returns the registry of available intent-driven verification skills."""
    return skill_registry.list_skills()

@app.get("/api/sessions/{session_id}")
def get_session_details(session_id: str):
    """Retrieves session messages, context state, and escalation tickets."""
    session = session_store.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session

@app.get("/api/sessions/{session_id}/export")
def export_session_transcript(
    session_id: str,
    format: str = Query("md", pattern="^(md|json|txt|text)$"),
    include_audit: bool = Query(True)
):
    """Exports session transcript into Markdown (.md), JSON (.json), or Plain Text (.txt)."""
    export_data = session_store.export_transcript(
        session_id=session_id,
        format_type=format,
        include_audit=include_audit
    )
    return Response(
        content=export_data["content"],
        media_type=export_data["content_type"],
        headers={
            "Content-Disposition": f'attachment; filename="{export_data["filename"]}"'
        }
    )

@app.post("/api/verify")
async def verify_claim(
    text: Optional[str] = Form(None),
    url: Optional[str] = Form(None),
    language_pref: Optional[str] = Form("auto"),
    force_refresh: Optional[bool] = Form(False),
    session_id: Optional[str] = Form(None),
    active_view: Optional[str] = Form("chat"),
    last_verdict_id: Optional[str] = Form(None),
    image: Optional[UploadFile] = File(None),
    cropped_image: Optional[UploadFile] = File(None)
):
    """
    Main 4-stage Multimodal Fact-Checking Pipeline with Intent-Driven Skills,
    Dynamic Quick Replies, Rich Cards, Session Context, and Run Audit Logs:
    0. Session Context & Skill Intent Router
    1. Multimodal Normalizer (OCR, EXIF, C2PA, RDAP WHOIS, Article Scraping)
    2. Atomic Claim Extractor Agent (Structured JSON claims)
    3. Evidence & Forensic Researcher Agent (Google Grounding, Fact Check Tools API)
    4. Adjudicator & Diff Engine (Verdict badges, Confidence score, Original vs Viral diff)
    """
    try:
        # Clean parameter values
        clean_text = text if isinstance(text, str) and text.strip() else None
        clean_url = url if isinstance(url, str) and url.strip() else None
        clean_lang = language_pref if isinstance(language_pref, str) else "auto"
        clean_refresh = force_refresh is True or str(force_refresh).lower() == "true"
        clean_session_id = session_id.strip() if isinstance(session_id, str) and session_id.strip() else f"sess_{uuid.uuid4().hex[:12]}"
        clean_active_view = active_view.strip() if isinstance(active_view, str) and active_view.strip() else "chat"
        clean_last_verdict_id = last_verdict_id.strip() if isinstance(last_verdict_id, str) and last_verdict_id.strip() else None
        clean_image = image if hasattr(image, "filename") and bool(getattr(image, "filename", None)) else None
        clean_crop = cropped_image if hasattr(cropped_image, "filename") and bool(getattr(cropped_image, "filename", None)) else None

        # Validation
        if not clean_text and not clean_url and not clean_image and not clean_crop:
            raise HTTPException(status_code=400, detail="Must provide at least one input: text, URL, or image.")

        audit_log = []

        # Step 0A: Session Context Initialization
        t_sess = time.perf_counter()
        session_obj = session_store.get_or_create_session(clean_session_id)
        session_store.update_context(clean_session_id, {
            "language": clean_lang,
            "active_view": clean_active_view,
            "last_verdict_id": clean_last_verdict_id
        })
        sess_ms = max(1, int((time.perf_counter() - t_sess) * 1000))
        audit_log.append({
            "step_name": "session_context",
            "status": "success",
            "duration_ms": sess_ms,
            "summary": f"Initialized session context {clean_session_id[:12]} (view: {clean_active_view}, lang: {clean_lang})"
        })

        # Step 0B: Skill Router
        t_skill = time.perf_counter()
        has_media = bool(clean_image or clean_crop or clean_url)
        skill_context = {
            "language": clean_lang,
            "active_view": clean_active_view,
            "last_verdict_id": clean_last_verdict_id,
            "has_media": has_media,
            "url": clean_url
        }
        skill_result = skill_registry.execute_pipeline(
            query=clean_text or "",
            context=skill_context,
            session_data=session_obj
        )
        if skill_result.force_refresh:
            clean_refresh = True
        if skill_result.session_updates:
            session_store.update_context(clean_session_id, skill_result.session_updates)

        skill_ms = max(1, int((time.perf_counter() - t_skill) * 1000))
        triggered_skills_dump = [s.to_dict() for s in skill_result.triggered_skills]

        if triggered_skills_dump:
            skill_names = ", ".join(s["display_name"] for s in triggered_skills_dump)
            audit_log.append({
                "step_name": "skill_router",
                "status": "success",
                "duration_ms": skill_ms,
                "summary": f"Triggered intent skills: {skill_names}"
            })
        else:
            audit_log.append({
                "step_name": "skill_router",
                "status": "skipped",
                "duration_ms": skill_ms,
                "summary": "No specific intent keywords matched; routing to 4-stage verification pipeline"
            })

        # Fast exit if skill directly resolved the request
        if skill_result.override_verdict_flow:
            summary_msg = skill_result.direct_message or skill_result.summary or "Intent skill executed successfully."
            override_resp = {
                "id": str(uuid.uuid4()),
                "overall_verdict": "SKILL_TRIGGERED",
                "confidence_score": 100,
                "summary_explanation": summary_msg,
                "detected_language": clean_lang if clean_lang != "auto" else "en",
                "claims": [],
                "metadata": {
                    "triggered_skills": triggered_skills_dump,
                    "pipeline_stages": [
                        {"stage": "skill_router", "name": "Intent Skill Router", "status": "completed"}
                    ]
                },
                "cards": skill_result.cards,
                "quick_replies": skill_result.quick_replies or [
                    "Verify a claim",
                    "Check source domain",
                    "Export transcript"
                ],
                "triggered_skills": triggered_skills_dump,
                "audit_log": audit_log,
                "session_id": clean_session_id,
                "is_cached": False,
                "is_skill_action": True
            }

            session_store.append_message(
                session_id=clean_session_id,
                role="user",
                content=clean_text or (clean_url or "Attached media"),
                url=clean_url
            )
            session_store.append_message(
                session_id=clean_session_id,
                role="assistant",
                content=summary_msg,
                verdict_data=override_resp,
                triggered_skills=triggered_skills_dump,
                cards=skill_result.cards,
                quick_replies=override_resp["quick_replies"],
                audit_log=audit_log
            )
            return override_resp

        image_bytes = None
        cropped_image_bytes = None
        image_rel_path = None
        cropped_image_rel_path = None
        image_phash = None

        # Handle image upload
        if clean_image:
            try:
                image_bytes = await clean_image.read()
            except Exception:
                try:
                    image_bytes = clean_image.file.read()
                except Exception:
                    image_bytes = None
            if image_bytes:
                ext = os.path.splitext(clean_image.filename or "")[1] or ".jpg"
                img_id = str(uuid.uuid4())
                filename = f"full_{img_id}{ext}"
                filepath = os.path.join(settings.UPLOAD_DIR, filename)
                with open(filepath, "wb") as f:
                    f.write(image_bytes)
                image_rel_path = f"/uploads/{filename}"

                # Quick hash for caching
                try:
                    from PIL import Image
                    import io
                    import imagehash
                    pil_img = Image.open(io.BytesIO(image_bytes))
                    image_phash = str(imagehash.phash(pil_img))
                except Exception:
                    pass

        # Handle cropped focus region (Circle-to-Search)
        if clean_crop:
            try:
                cropped_image_bytes = await clean_crop.read()
            except Exception:
                try:
                    cropped_image_bytes = clean_crop.file.read()
                except Exception:
                    cropped_image_bytes = None
            if cropped_image_bytes:
                ext = os.path.splitext(clean_crop.filename or "")[1] or ".jpg"
                crop_id = str(uuid.uuid4())
                crop_filename = f"crop_{crop_id}{ext}"
                crop_filepath = os.path.join(settings.UPLOAD_DIR, crop_filename)
                with open(crop_filepath, "wb") as f:
                    f.write(cropped_image_bytes)
                cropped_image_rel_path = f"/uploads/{crop_filename}"

        # Check semantic cache with image bytes + crop bytes + text + url hash
        t_cache = time.perf_counter()
        query_hash = generate_query_hash(
            text=clean_text,
            url=clean_url,
            image_bytes=image_bytes,
            cropped_bytes=cropped_image_bytes,
            image_hash_str=image_phash
        )
        if not clean_refresh:
            cached_result = get_cached_verification(query_hash)
            if cached_result:
                cache_ms = max(1, int((time.perf_counter() - t_cache) * 1000))
                audit_log.append({
                    "step_name": "evidence_lookup",
                    "status": "cached",
                    "duration_ms": cache_ms,
                    "summary": f"Cache HIT: Found exact semantic verification report (ID: {cached_result.get('id', '')[:8]})"
                })
                audit_log.append({
                    "step_name": "adjudicator",
                    "status": "cached",
                    "duration_ms": 1,
                    "summary": f"Served cached verdict: {cached_result.get('overall_verdict')} ({cached_result.get('confidence_score', 0)}%)"
                })

                cached_result["is_cached"] = True
                cached_result["session_id"] = clean_session_id
                cached_result["triggered_skills"] = triggered_skills_dump
                cached_result["cards"] = skill_result.cards
                cached_result["quick_replies"] = skill_result.quick_replies or [
                    "Re-verify live",
                    "Check source domain",
                    "Share verification card",
                    "Escalate to editorial"
                ]
                cached_result["audit_log"] = audit_log

                session_store.append_message(
                    session_id=clean_session_id,
                    role="user",
                    content=clean_text or (clean_url or "Attached media"),
                    url=clean_url,
                    image_path=image_rel_path
                )
                session_store.append_message(
                    session_id=clean_session_id,
                    role="assistant",
                    content=cached_result.get("summary_explanation", ""),
                    verdict_data=cached_result,
                    triggered_skills=triggered_skills_dump,
                    cards=cached_result["cards"],
                    quick_replies=cached_result["quick_replies"],
                    audit_log=audit_log
                )
                return cached_result

        cache_ms = max(1, int((time.perf_counter() - t_cache) * 1000))
        audit_log.append({
            "step_name": "cache_lookup",
            "status": "skipped" if clean_refresh else "fallback",
            "duration_ms": cache_ms,
            "summary": "Live re-verification requested (bypass cache)" if clean_refresh else "Cache miss: commencing live 4-stage pipeline"
        })

        # Stage 1: Multimodal Normalizer
        t_stage1 = time.perf_counter()
        normalized = run_stage_1_normalizer(
            text=clean_text,
            url=clean_url,
            image_bytes=image_bytes,
            cropped_image_bytes=cropped_image_bytes,
            language_pref=clean_lang
        )
        s1_ms = max(1, int((time.perf_counter() - t_stage1) * 1000))
        audit_log.append({
            "step_name": "normalizer_ocr",
            "status": "success",
            "duration_ms": s1_ms,
            "summary": f"Normalized {normalized.input_type} ({len(normalized.primary_text)} chars); OCR & metadata parsed"
        })

        # Stage 2: Atomic Claim Extractor Agent
        t_stage2 = time.perf_counter()
        extraction = run_stage_2_extractor(
            normalized_text=normalized.primary_text,
            context_notes=f"Input Type: {normalized.input_type}, Cropped Text: {normalized.cropped_text}"
        )
        s2_ms = max(1, int((time.perf_counter() - t_stage2) * 1000))
        audit_log.append({
            "step_name": "claim_extractor",
            "status": "success",
            "duration_ms": s2_ms,
            "summary": f"Extracted {len(extraction.claims)} factual claims; filtered {len(extraction.filtered_opinions)} subjective statements"
        })

        # Stage 3: Evidence & Forensic Researcher Agent
        t_stage3 = time.perf_counter()
        evidences = run_stage_3_researcher(
            claims=extraction.claims,
            image_forensics=normalized.image_forensics,
            domain_reputation=normalized.domain_reputation
        )
        s3_ms = max(1, int((time.perf_counter() - t_stage3) * 1000))
        total_sources = sum(len(e.sources) for e in evidences)
        audit_log.append({
            "step_name": "evidence_lookup",
            "status": "success",
            "duration_ms": s3_ms,
            "summary": f"Corroborated claims with {total_sources} live search & fact-check sources"
        })

        # Stage 4: Adjudicator & Diff Engine
        t_stage4 = time.perf_counter()
        report = run_stage_4_adjudicator(
            claims=extraction.claims,
            evidences=evidences,
            normalized_input=normalized
        )
        s4_ms = max(1, int((time.perf_counter() - t_stage4) * 1000))
        audit_log.append({
            "step_name": "adjudicator",
            "status": "success",
            "duration_ms": s4_ms,
            "summary": f"Final verdict adjudicator: {report.overall_verdict} ({report.confidence_score}% confidence score)"
        })

        record_id = str(uuid.uuid4())

        # Compile claims for SQLite storage
        stored_claims = []
        for cv in report.claim_verdicts:
            stored_claims.append({
                "claim_text": cv.claim_text,
                "claim_type": "factual",
                "verdict": cv.verdict,
                "confidence": cv.confidence,
                "explanation": cv.explanation,
                "sources": cv.sources
            })

        # Compile comprehensive metadata for the report
        metadata_payload = {
            "actual_fact": report.actual_fact,
            "viewer_correction": report.viewer_correction.model_dump() if hasattr(report.viewer_correction, "model_dump") else (report.viewer_correction or {}),
            "fetched_image_data": report.fetched_image_data,
            "image_origin_metadata": report.image_origin_metadata,
            "filtered_opinions": extraction.filtered_opinions,
            "domain_reputation": normalized.domain_reputation,
            "article_content": {
                "title": normalized.article_content.get("title", ""),
                "author": normalized.article_content.get("author", ""),
                "publish_date": normalized.article_content.get("publish_date", ""),
                "platform": normalized.article_content.get("platform", ""),
                "sensationalism_score": normalized.article_content.get("headline_sensationalism_score", 0),
            },
            "image_forensics": normalized.image_forensics,
            "visual_ocr": normalized.visual_ocr,
            "headline_audit": report.headline_audit.model_dump() if report.headline_audit else None,
            "image_diff": report.image_diff.model_dump() if report.image_diff else None,
            "shareable_receipt": report.shareable_receipt_data,
            "triggered_skills": triggered_skills_dump,
            "pipeline_stages": [
                {"stage": 1, "name": "Multimodal Normalizer & OCR", "status": "completed"},
                {"stage": 2, "name": "Atomic Claim Extractor Agent", "status": "completed", "claims_extracted": len(extraction.claims)},
                {"stage": 3, "name": "Evidence & Forensic Researcher Agent", "status": "completed", "sources_analyzed": total_sources},
                {"stage": 4, "name": "Adjudicator & Diff Engine", "status": "completed"}
            ]
        }

        # Save to SQLite database & cache
        saved = save_verification(
            record_id=record_id,
            query_hash=query_hash,
            input_type=normalized.input_type,
            raw_input=clean_text,
            url=clean_url,
            image_path=image_rel_path,
            cropped_image_path=cropped_image_rel_path,
            overall_verdict=report.overall_verdict,
            confidence_score=report.confidence_score,
            summary_explanation=report.summary_explanation,
            detected_language=report.detected_language,
            metadata=metadata_payload,
            claims=stored_claims
        )

        saved["is_cached"] = False
        saved["session_id"] = clean_session_id
        saved["actual_fact"] = report.actual_fact
        saved["viewer_correction"] = report.viewer_correction.model_dump() if hasattr(report.viewer_correction, "model_dump") else (report.viewer_correction or {})
        saved["fetched_image_data"] = report.fetched_image_data
        saved["image_origin_metadata"] = report.image_origin_metadata
        saved["triggered_skills"] = triggered_skills_dump
        saved["cards"] = skill_result.cards

        # Dynamic contextual quick-replies based on verdict & input
        final_quick_replies = list(skill_result.quick_replies) if skill_result.quick_replies else []
        if not final_quick_replies:
            if clean_url or "http" in (clean_text or ""):
                final_quick_replies.append("Check source domain")
            final_quick_replies.append("Re-verify live")
            final_quick_replies.append("Share verification card")
            if report.confidence_score < 75 or "UNVERIFIED" in report.overall_verdict:
                final_quick_replies.append("Escalate to editorial")
            else:
                final_quick_replies.append("Export transcript")

        saved["quick_replies"] = final_quick_replies[:4]
        saved["audit_log"] = audit_log

        # Save to session conversation
        session_store.append_message(
            session_id=clean_session_id,
            role="user",
            content=clean_text or (clean_url or "Attached media"),
            url=clean_url,
            image_path=image_rel_path
        )
        session_store.append_message(
            session_id=clean_session_id,
            role="assistant",
            content=report.summary_explanation,
            verdict_data=saved,
            triggered_skills=triggered_skills_dump,
            cards=saved["cards"],
            quick_replies=saved["quick_replies"],
            audit_log=audit_log
        )

        return saved
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Fact-checking engine exception: {str(e)}"
        )
