import os
import tempfile
from typing import List
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

class Settings:
    # API Keys - read strictly from environment / Worker bindings
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "").strip()
    SERPAPI_KEY: str = os.getenv("SERPAPI_KEY", "").strip()
    GOOGLE_FACTCHECK_API_KEY: str = os.getenv("GOOGLE_FACTCHECK_API_KEY", "").strip()

    # Server configuration
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "production")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8001"))

    # CORS Origins - supports ALLOWED_ORIGINS and CORS_ORIGINS
    _raw_origins = os.getenv("ALLOWED_ORIGINS") or os.getenv("CORS_ORIGINS", "*")
    if _raw_origins.strip() == "*":
        CORS_ORIGINS: List[str] = ["*"]
    else:
        CORS_ORIGINS: List[str] = [
            origin.strip()
            for origin in _raw_origins.split(",")
            if origin.strip()
        ]
        # Always allow standard local dev ports for convenience if not already present
        for local_origin in ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000"]:
            if local_origin not in CORS_ORIGINS:
                CORS_ORIGINS.append(local_origin)

    # Database & Cache
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./sachbot.db")
    CACHE_EXPIRATION_HOURS: int = int(os.getenv("CACHE_EXPIRATION_HOURS", "72"))

    # Uploads directory - safe fallback to system tempdir for read-only / serverless runtimes
    _default_upload = os.path.join(os.path.dirname(os.path.dirname(__file__)), "uploads")
    try:
        if not os.path.exists(_default_upload):
            os.makedirs(_default_upload, exist_ok=True)
        UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", _default_upload)
    except Exception:
        UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", os.path.join(tempfile.gettempdir(), "sachbot_uploads"))

    # Model names
    GEMINI_MULTIMODAL_MODEL: str = os.getenv("GEMINI_MULTIMODAL_MODEL", "gemini-2.5-flash")
    GEMINI_REASONING_MODEL: str = os.getenv("GEMINI_REASONING_MODEL", "gemini-2.5-pro")

    @property
    def has_gemini(self) -> bool:
        return bool(self.GEMINI_API_KEY and self.GEMINI_API_KEY != "your_gemini_api_key_here")

    @property
    def has_serpapi(self) -> bool:
        return bool(self.SERPAPI_KEY and self.SERPAPI_KEY != "your_serpapi_key_here")

    @property
    def has_factcheck_api(self) -> bool:
        return bool(self.GOOGLE_FACTCHECK_API_KEY and self.GOOGLE_FACTCHECK_API_KEY != "your_factcheck_api_key_here")

settings = Settings()

# Safe directory creation
try:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
except Exception:
    pass
