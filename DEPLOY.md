# Sachbot Deployment Guide

Sachbot supports two free, zero-cost production hosting architectures:
1. **Option 1 (Recommended — Monolith on the Edge):** Cloudflare Workers (Python Worker + Static Assets on a single domain)
2. **Option 2 (Split Deployment):** Cloudflare Pages (Frontend) + Render / Hugging Face Spaces (Backend)
3. **Option 3 (Docker Container):** Multi-stage production container

---

## Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │              USER BROWSER                    │
                      └──────────────────────┬───────────────────────┘
                                             │
                       ┌─────────────────────┴─────────────────────┐
                       │                                           │
             [Option 1: Cloudflare Worker]              [Option 2: Split Hosting]
             ┌───────────────────────────┐              ┌───────────────────────────┐
             │   sachbot.workers.dev     │              │     sachbot.pages.dev     │
             │                           │              │   (Static React Assets)   │
             │ ┌───────────────────────┐ │              └─────────────┬─────────────┘
             │ │ Static Assets (React) │ │                            │ /api/*
             │ │ /* -> /dist           │ │                            ▼
             │ └───────────────────────┘ │              ┌───────────────────────────┐
             │                           │              │    Render / Hugging Face  │
             │ ┌───────────────────────┐ │              │   sachbot.onrender.com    │
             │ │ Python Worker (FastAPI│ │              │   (FastAPI Backend)       │
             │ │ /api/* -> worker.py   │ │              └───────────────────────────┘
             │ └───────────────────────┘ │
             └───────────────────────────┘
```

---

## Option 1: Cloudflare Workers (Fullstack Python + Static Assets)

Deploy frontend and backend together under a single free `*.workers.dev` domain with zero CORS issues.

### 1. Prerequisites
- [Node.js 18+](https://nodejs.org/) & `npm`
- [Python 3.11+](https://python.org/) or [uv](https://astral.sh/uv)
- A free [Cloudflare Account](https://dash.cloudflare.com/)

### 2. Build Frontend Assets
```bash
# Build the Vite frontend into ./frontend/dist
npm run build --prefix frontend
```

### 3. Test Locally with Wrangler
```bash
# Install Wrangler CLI (if not installed)
npm install -g wrangler

# Run local preview with Python worker + static assets
npx wrangler dev
```
Open `http://localhost:8787` in your browser. Both the React UI and `/api/*` endpoints will be live.

### 4. Configure Production Secrets
Set your Google Gemini API key securely in Cloudflare:
```bash
# Authenticate with Cloudflare
npx wrangler login

# Add secrets to Cloudflare Workers
npx wrangler secret put GEMINI_API_KEY
# (Paste your Google AI Studio API key when prompted)

# Optional: Add SerpAPI or Fact Check keys
npx wrangler secret put SERPAPI_KEY
npx wrangler secret put GOOGLE_FACTCHECK_API_KEY
```

### 5. Deploy to Cloudflare
```bash
npx wrangler deploy
```
Your application will be live at `https://sachbot.<your-subdomain>.workers.dev` with global edge caching and zero cold-start fees.

---

## Option 2: Split Hosting (Cloudflare Pages + Render / Hugging Face)

Use Cloudflare Pages for lightning-fast frontend static delivery and Render / Hugging Face for the backend Python API.

### Part A: Deploy Backend on Render (Free Tier)
1. Fork or push this repository to GitHub.
2. Sign in to [Render Dashboard](https://dashboard.render.com/) and click **New +** → **Blueprint** (or **Web Service**).
3. Select your repository. Render automatically reads `render.yaml`:
   - **Runtime:** Python 3.11
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path:** `/api/health`
4. In the Render Environment tab, add your secret:
   - `GEMINI_API_KEY` = `<your-api-key>`
   - `ALLOWED_ORIGINS` = `*` (or your Cloudflare Pages domain)
5. Click **Deploy**. Note your backend URL (e.g., `https://sachbot-api.onrender.com`).

---

### Part B: Deploy Frontend on Cloudflare Pages
1. In `frontend/.env.production` (or Cloudflare Pages Environment Variables), configure your Render backend URL:
   ```env
   VITE_API_BASE_URL=https://sachbot-api.onrender.com
   ```
2. In Cloudflare Dashboard, go to **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**.
3. Set build configuration:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Root Directory:** `frontend`
   - **Output Directory:** `dist`
4. Add Environment Variable:
   - `VITE_API_BASE_URL`: `https://sachbot-api.onrender.com`
5. Click **Save and Deploy**.

---

## Option 3: Single Docker Container (Render / Hugging Face Spaces)

A unified multi-stage container that compiles the React frontend and serves both static files and the FastAPI backend via Uvicorn.

### 1. Build and Run with Docker Locally
```bash
# Build production image
docker build -t sachbot:latest .

# Run container locally
docker run -p 8001:8001 -e GEMINI_API_KEY="your_api_key" sachbot:latest
```
Visit `http://localhost:8001` in your browser.

### 2. Deploy on Hugging Face Spaces
1. Create a new Space on [Hugging Face Spaces](https://huggingface.co/spaces).
2. Choose **Docker** as the SDK (Blank).
3. Push this repository to your Space repository.
4. Go to **Settings** → **Variables and secrets** and add `GEMINI_API_KEY`.
5. Hugging Face will automatically build the `Dockerfile` and launch Sachbot.

---

## Verification & Health Check

After deployment, confirm that all subsystems are operational:

1. **Health Endpoint:**
   ```bash
   curl -i https://<your-deployed-domain>/api/health
   ```
   Expected response:
   ```json
   {
     "status": "ok",
     "mode": "production",
     "gemini_configured": true,
     "cache_stats": {
       "storage_mode": "in-memory"
     }
   }
   ```

2. **Claim Verification Test:**
   ```bash
   curl -X POST https://<your-deployed-domain>/api/verify \
     -F "text=is amitab bachan dead" \
     -F "force_refresh=true"
   ```
   Expected response:
   ```json
   {
     "overall_verdict": "FALSE / HOAX",
     "confidence_score": 0.0,
     "actual_fact": "Amitabh Bachchan is alive and actively engaged in their personal and professional life..."
   }
   ```

---

## Summary of Configuration Files

| File | Purpose |
|---|---|
| `wrangler.jsonc` | Cloudflare Workers configuration (Python Worker + Static Assets) |
| `worker.py` | Cloudflare Workers Python ASGI entrypoint |
| `frontend/src/config/api.js` | Centralized `API_BASE_URL` resolver (`VITE_API_BASE_URL` or same-origin) |
| `frontend/.env.example` | Frontend environment variables template |
| `frontend/.env.production` | Frontend production template |
| `pyproject.toml` | Python packaging definition with `edge` and `full` dependency sets |
| `requirements-edge.txt` | Lean dependencies for Cloudflare Python Worker runtime |
| `requirements.txt` | Production dependencies for Docker / Render / Hugging Face |
| `Dockerfile` | Multi-stage production container build |
| `render.yaml` | Infrastructure as code blueprint for Render web services |
| `.gitignore` | Ignores secrets, caches, database files, and build outputs |
