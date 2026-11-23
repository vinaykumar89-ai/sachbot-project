"""
Cloudflare Python Worker Entrypoint for Sachbot.
Runs the FastAPI investigative fact-checking application on Cloudflare Workers edge runtime.
"""
import sys
import os

# Ensure project root is in Python module search path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from backend.main import app

# Cloudflare Workers Python runtime exposes `workers.asgi`
try:
    from workers import asgi
    Default = asgi.entrypoint(app)
except ImportError:
    # Fallback for local testing or standard ASGI runtimes
    Default = app

# Worker entrypoint export
entrypoint = Default
