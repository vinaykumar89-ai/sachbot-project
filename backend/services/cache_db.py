import os
import json
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import create_engine, Column, Integer, String, Text, Float, DateTime, ForeignKey, Index
from sqlalchemy.orm import declarative_base, sessionmaker, relationship, joinedload

try:
    from backend.config import settings
    from backend.services.live_grounding import normalize_query_entities
except ImportError:
    from config import settings
    from services.live_grounding import normalize_query_entities

Base = declarative_base()

class VerificationRecord(Base):
    __tablename__ = "verifications"

    id = Column(String(36), primary_key=True)
    query_hash = Column(String(64), index=True, nullable=False)
    input_type = Column(String(20), nullable=False)  # 'text', 'url', 'image', 'multimodal'
    raw_input = Column(Text, nullable=True)
    url = Column(String(512), nullable=True)
    image_path = Column(String(256), nullable=True)
    cropped_image_path = Column(String(256), nullable=True)
    
    overall_verdict = Column(String(40), nullable=False)  # TRUE, FALSE, MISLEADING / OUT OF CONTEXT, etc.
    confidence_score = Column(Float, nullable=False)  # 0.0 to 100.0
    summary_explanation = Column(Text, nullable=False)
    detected_language = Column(String(20), default="en")
    
    # JSON-encoded metadata (forensics, whois, headline vs article audit, diffs)
    metadata_json = Column(Text, default="{}")
    
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    claims = relationship("ClaimRecord", back_populates="verification", cascade="all, delete-orphan")

    def to_dict(self) -> Dict[str, Any]:
        meta = {}
        try:
            meta = json.loads(self.metadata_json) if self.metadata_json else {}
        except Exception:
            pass
        return {
            "id": self.id,
            "query_hash": self.query_hash,
            "input_type": self.input_type,
            "raw_input": self.raw_input,
            "url": self.url,
            "image_path": self.image_path,
            "cropped_image_path": self.cropped_image_path,
            "overall_verdict": self.overall_verdict,
            "confidence_score": self.confidence_score,
            "summary_explanation": self.summary_explanation,
            "actual_fact": meta.get("actual_fact", ""),
            "viewer_correction": meta.get("viewer_correction", {}),
            "fetched_image_data": meta.get("fetched_image_data", {}),
            "image_origin_metadata": meta.get("image_origin_metadata", {}),
            "detected_language": self.detected_language,
            "metadata": meta,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "claims": [c.to_dict() for c in self.claims]
        }

class ClaimRecord(Base):
    __tablename__ = "claims"

    id = Column(Integer, primary_key=True, autoincrement=True)
    verification_id = Column(String(36), ForeignKey("verifications.id", ondelete="CASCADE"), nullable=False)
    claim_text = Column(Text, nullable=False)
    claim_type = Column(String(40), default="factual")  # quote, statistic, event, policy, etc.
    verdict = Column(String(40), nullable=False)
    confidence = Column(Float, nullable=False)
    explanation = Column(Text, nullable=False)
    sources_json = Column(Text, default="[]")

    verification = relationship("VerificationRecord", back_populates="claims")

    def to_dict(self) -> Dict[str, Any]:
        sources = []
        try:
            sources = json.loads(self.sources_json) if self.sources_json else []
        except Exception:
            pass
        return {
            "id": self.id,
            "claim_text": self.claim_text,
            "claim_type": self.claim_type,
            "verdict": self.verdict,
            "confidence": self.confidence,
            "explanation": self.explanation,
            "sources": sources
        }

# ==============================================================================
# IN-MEMORY TTL CACHE (Stateless serverless fallback for Cloudflare Workers)
# ==============================================================================
class InMemoryTTLCache:
    """Fast in-memory TTL cache for serverless environments with no writable disk."""
    def __init__(self, ttl_hours: int = 72):
        self.ttl = timedelta(hours=ttl_hours)
        self._cache: Dict[str, Dict[str, Any]] = {}
        self._history: List[Dict[str, Any]] = []

    def get(self, query_hash: str) -> Optional[Dict[str, Any]]:
        entry = self._cache.get(query_hash)
        if not entry:
            return None
        created = entry.get("_created_dt", datetime.now(timezone.utc))
        if datetime.now(timezone.utc) - created > self.ttl:
            self._cache.pop(query_hash, None)
            return None
        res = dict(entry)
        res.pop("_created_dt", None)
        res["is_cached"] = True
        return res

    def set(self, record_id: str, query_hash: str, data: Dict[str, Any]):
        entry = dict(data)
        entry["_created_dt"] = datetime.now(timezone.utc)
        self._cache[query_hash] = entry
        self._history = [entry] + [h for h in self._history if h.get("id") != record_id][:49]

    def get_history(self, limit: int = 20) -> List[Dict[str, Any]]:
        return [dict(h) for h in self._history[:limit]]

    def get_by_id(self, record_id: str) -> Optional[Dict[str, Any]]:
        for h in self._history:
            if h.get("id") == record_id:
                return dict(h)
        return None

    def stats(self) -> Dict[str, Any]:
        return {
            "total_verifications": len(self._history),
            "total_atomic_claims": sum(len(h.get("claims", [])) for h in self._history),
            "cache_ttl_hours": settings.CACHE_EXPIRATION_HOURS,
            "db_path": "in-memory (serverless/edge mode)"
        }

_memory_cache = InMemoryTTLCache(ttl_hours=settings.CACHE_EXPIRATION_HOURS)
_use_sqlite = False
engine = None
SessionLocal = None

# Graceful Database engine & session setup
try:
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False, "timeout": 15} if "sqlite" in settings.DATABASE_URL else {}
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, expire_on_commit=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    _use_sqlite = True
except Exception as e:
    print(f"Database initialization notice (using in-memory TTL cache): {e}")
    _use_sqlite = False

def generate_query_hash(
    text: Optional[str] = None,
    url: Optional[str] = None,
    image_bytes: Optional[bytes] = None,
    cropped_bytes: Optional[bytes] = None,
    image_hash_str: Optional[str] = None
) -> str:
    """
    Generates a high-integrity normalized SHA256 hash for semantic caching.
    Includes normalized entity text, url, image bytes SHA-256, cropped focus region SHA-256,
    and perceptual image hash to ensure zero cache collisions between distinct media.
    """
    elements = []
    if text:
        norm = normalize_query_entities(text)
        resolved_text = norm.get("resolved_text") or text
        normalized_text = " ".join(resolved_text.lower().strip().split())
        elements.append(f"text:{normalized_text}")
    if url:
        normalized_url = url.strip().lower().rstrip("/")
        elements.append(f"url:{normalized_url}")
    if image_bytes:
        img_sha = hashlib.sha256(image_bytes).hexdigest()[:24]
        elements.append(f"img_sha:{img_sha}")
    if cropped_bytes:
        crop_sha = hashlib.sha256(cropped_bytes).hexdigest()[:24]
        elements.append(f"crop_sha:{crop_sha}")
    if image_hash_str:
        elements.append(f"imghash:{image_hash_str.strip().lower()}")
    
    combined = "|".join(elements) if elements else "empty"
    return hashlib.sha256(combined.encode("utf-8")).hexdigest()

def get_cached_verification(query_hash: str) -> Optional[Dict[str, Any]]:
    """
    Retrieves a cached verification if it exists, hasn't expired, is high-quality,
    and has grounded citations. Bypasses cache if the cached verdict was UNVERIFIED
    or lacked verifiable source citations.
    """
    if _use_sqlite and SessionLocal:
        session = SessionLocal()
        try:
            cutoff = datetime.now(timezone.utc) - timedelta(hours=settings.CACHE_EXPIRATION_HOURS)
            record = (
                session.query(VerificationRecord)
                .options(joinedload(VerificationRecord.claims))
                .filter(VerificationRecord.query_hash == query_hash)
                .order_by(VerificationRecord.created_at.desc())
                .first()
            )
            if record:
                # Bypass cache if previous record was UNVERIFIED or failed to ground
                if str(record.overall_verdict).strip().startswith("UNVERIFIED"):
                    return None

                # Verify that the record contains at least one real source citation
                has_sources = False
                for c in record.claims:
                    try:
                        s_list = json.loads(c.sources_json) if c.sources_json else []
                        if s_list and len(s_list) > 0:
                            has_sources = True
                            break
                    except Exception:
                        pass
                
                # Also check metadata sources
                if not has_sources and record.metadata_json:
                    try:
                        m = json.loads(record.metadata_json)
                        if m.get("shareable_receipt", {}).get("top_citations"):
                            has_sources = True
                    except Exception:
                        pass

                if not has_sources:
                    return None

                # Check if cache is still fresh
                rec_created = record.created_at
                if rec_created.tzinfo is None:
                    rec_created = rec_created.replace(tzinfo=timezone.utc)
                if rec_created >= cutoff:
                    result = record.to_dict()
                    result["is_cached"] = True
                    return result
        except Exception as e:
            print(f"SQLite cache read notice: {e}")
        finally:
            session.close()

    # Fallback to in-memory TTL cache
    return _memory_cache.get(query_hash)

def save_verification(
    record_id: str,
    query_hash: str,
    input_type: str,
    raw_input: Optional[str],
    url: Optional[str],
    image_path: Optional[str],
    cropped_image_path: Optional[str],
    overall_verdict: str,
    confidence_score: float,
    summary_explanation: str,
    detected_language: str,
    metadata: Dict[str, Any],
    claims: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """Saves a verification and its atomic claims to SQLite and in-memory cache."""
    now_utc = datetime.now(timezone.utc)
    res_dict = {
        "id": record_id,
        "query_hash": query_hash,
        "input_type": input_type,
        "raw_input": raw_input,
        "url": url,
        "image_path": image_path,
        "cropped_image_path": cropped_image_path,
        "overall_verdict": overall_verdict,
        "confidence_score": confidence_score,
        "summary_explanation": summary_explanation,
        "detected_language": detected_language,
        "metadata": metadata,
        "created_at": now_utc.isoformat(),
        "claims": claims
    }

    # Mirror into in-memory TTL cache
    _memory_cache.set(record_id, query_hash, res_dict)

    if _use_sqlite and SessionLocal:
        session = SessionLocal()
        try:
            rec = VerificationRecord(
                id=record_id,
                query_hash=query_hash,
                input_type=input_type,
                raw_input=raw_input,
                url=url,
                image_path=image_path,
                cropped_image_path=cropped_image_path,
                overall_verdict=overall_verdict,
                confidence_score=confidence_score,
                summary_explanation=summary_explanation,
                detected_language=detected_language,
                metadata_json=json.dumps(metadata),
                created_at=now_utc,
                updated_at=now_utc
            )
            session.add(rec)
            session.flush()

            for c in claims:
                claim_rec = ClaimRecord(
                    verification_id=record_id,
                    claim_text=c.get("claim_text", ""),
                    claim_type=c.get("claim_type", "factual"),
                    verdict=c.get("verdict", "UNVERIFIED"),
                    confidence=float(c.get("confidence", 50.0)),
                    explanation=c.get("explanation", ""),
                    sources_json=json.dumps(c.get("sources", []))
                )
                session.add(claim_rec)
            
            session.commit()
        except Exception as e:
            session.rollback()
            print(f"SQLite save notice (cached in-memory): {e}")
        finally:
            session.close()

    return res_dict

def get_recent_history(limit: int = 20) -> List[Dict[str, Any]]:
    """Returns the most recent verification history."""
    if _use_sqlite and SessionLocal:
        session = SessionLocal()
        try:
            records = (
                session.query(VerificationRecord)
                .options(joinedload(VerificationRecord.claims))
                .order_by(VerificationRecord.created_at.desc())
                .limit(limit)
                .all()
            )
            if records:
                return [r.to_dict() for r in records]
        except Exception as e:
            print(f"SQLite history read notice: {e}")
        finally:
            session.close()

    return _memory_cache.get_history(limit)

def get_verification_by_id(record_id: str) -> Optional[Dict[str, Any]]:
    """Fetches a specific verification record by ID."""
    if _use_sqlite and SessionLocal:
        session = SessionLocal()
        try:
            rec = session.query(VerificationRecord).filter(VerificationRecord.id == record_id).first()
            if rec:
                return rec.to_dict()
        except Exception as e:
            print(f"SQLite get_by_id notice: {e}")
        finally:
            session.close()

    return _memory_cache.get_by_id(record_id)

def get_cache_stats() -> Dict[str, Any]:
    """Returns cache and database statistics."""
    if _use_sqlite and SessionLocal:
        session = SessionLocal()
        try:
            total = session.query(VerificationRecord).count()
            claims_count = session.query(ClaimRecord).count()
            return {
                "total_verifications": total,
                "total_atomic_claims": claims_count,
                "cache_ttl_hours": settings.CACHE_EXPIRATION_HOURS,
                "db_path": settings.DATABASE_URL,
                "storage_mode": "sqlite"
            }
        except Exception as e:
            print(f"SQLite stats notice: {e}")
        finally:
            session.close()

    mem_stats = _memory_cache.stats()
    mem_stats["storage_mode"] = "in-memory"
    return mem_stats
