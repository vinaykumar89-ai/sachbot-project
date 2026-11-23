# Sachbot (सच • Truth) 🛡️
### Autonomous Multimodal AI Fact-Checking and Claim Verification Engine

Sachbot is an autonomous investigative fact-checking chatbot and verification platform. Unlike standard conversational bots that answer from static, unverified training memory, Sachbot never hallucinates verdicts—it executes an orchestrated **4-Stage Multi-Agent Verification Pipeline** grounded in live web search, reverse image origin tracing, deep forensic metadata inspection, domain reputation audits, and official IFCN fact-checking registries.

---

## 🌟 Core Capabilities & Features

### 1. Multi-Input Ingestion Bar
- **WhatsApp / Telegram Viral Forwards & Text:** Paste raw messages, quotes, rumors, or unverified claims.
- **Image & Screenshot Upload with "Circle-to-Search" Cropper:**
  - Interactive bounding box and circular focus region selector before submitting.
  - Draw a box or circle around a specific headline, viral tweet screenshot, chart, or face.
  - Sends both the cropped region (for focused OCR + visual search) and the full image context to the backend.
- **Social Media & News URL Analyzer:**
  - Paste URLs from News Articles, YouTube Shorts, X/Twitter, Instagram Reels, or Reddit.
  - Automatically scrapes the article body, extracts captions, retrieves video metadata, and runs a domain reputation audit.
- **Headline vs. Article Audit:**
  - Evaluates news links to determine if the article body contradicts, softens, or refutes an alarming or sensationalized headline.
  - Computes a Headline Sensationalism Score (0–100%) and highlights clickbait triggers.
- **Multilingual & Hinglish Support:**
  - Automatically detects Indian regional languages (Hindi, Tamil, Telugu, Kannada, Bengali, Marathi) and Hinglish.
  - Translates claims internally for search grounding and delivers the final verdict explanation in the user's input language.

### 2. 4-Stage Autonomous Multi-Agent Verification Pipeline
```
[User Input: Text / URL / Image + Crop]
                  │
                  ▼
┌──────────────────────────────────────────────┐
│  Stage 1: Multimodal Normalizer              │
│  • Text sanitization & language detection    │
│  • OCR on cropped focus region & full image  │
│  • Image forensics: EXIF, C2PA, ELA, pHash   │
│  • Domain WHOIS / RDAP & satire site checks  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Stage 2: Atomic Claim Extractor Agent       │
│  • Structured JSON factual claim extraction  │
│  • Isolates dates, statistics, quotes, laws  │
│  • Filters out subjective opinions & rants   │
│  • Formulates targeted verification queries  │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Stage 3: Evidence & Grounding Researcher    │
│  • Gemini Google Search Grounding            │
│  • Google Fact Check Tools API (IFCN checks) │
│  • Reverse image origin & cheapfake lookup   │
│  • Primary government & wire source priority │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────┐
│  Stage 4: Adjudicator & Diff Engine          │
│  • Assigns verdict badges (TRUE/FALSE/etc.)  │
│  • Computes 0–100% truth confidence score    │
│  • Generates Side-by-Side Context Diff       │
│  • Produces multilingual evidence summary    │
└──────────────────────┬───────────────────────┘
                       │
                       ▼
[Claim-by-Claim Verdict Cards + Mobile PNG Receipt Card]
```

### 3. Verdict Badges & Forensic Trust Tools
- **Verdict Badges:**
  - `TRUE` (Emerald Green)
  - `FALSE` (Crimson Red)
  - `MISLEADING / OUT OF CONTEXT` (Amber Yellow)
  - `CLICKBAIT EXAGGERATION` (Vibrant Orange)
  - `AI-GENERATED / ALTERED` (Purple)
  - `UNVERIFIED` (Slate Gray)
- **Side-by-Side "Original vs. Viral" Diff View:**
  - Compares recycled or out-of-context media side-by-side with the earliest original source found online.
  - Displays Claimed Date vs. Real Date, Claimed Context vs. Real Historical Event.
- **Deep Media Forensics Inspector:**
  - EXIF tags & camera metadata.
  - AI generator fingerprints (Midjourney, Stable Diffusion, DALL-E, Firefly, C2PA).
  - Error Level Analysis (ELA) compression disparity detection.
  - Perceptual image hashes (pHash, aHash, dHash).
- **Shareable "Sachbot Verification Receipt":**
  - Mobile-sized truth receipt with a rubber-stamp verdict, truth score meter, top citations, and a QR code linking to the full audit.
  - Downloadable as a high-resolution PNG to share directly back into WhatsApp / Telegram groups.
- **Semantic Claim Cache:**
  - Normalizes and hashes claims into SQLite (`sachbot.db`) so repeat inquiries return instant cached audits with an option to "Re-verify Live".

---

## 🏗️ Project Architecture & Folder Structure

```
Sachbot/
├── backend/
│   ├── main.py                     # FastAPI application, CORS, static uploads & endpoints
│   ├── config.py                   # Pydantic environment configuration
│   ├── requirements.txt            # Python dependencies
│   ├── agents/
│   │   ├── normalizer.py           # Stage 1: Multimodal Normalizer (OCR, EXIF, RDAP, Trafilatura)
│   │   ├── extractor.py            # Stage 2: Atomic Claim Extractor Agent (Structured JSON)
│   │   ├── researcher.py           # Stage 3: Evidence & Forensic Researcher Agent (Search Grounding)
│   │   └── adjudicator.py          # Stage 4: Adjudicator & Diff Engine (Verdict & Diff Matrix)
│   └── services/
│       ├── gemini_client.py        # Gemini API client, Search Grounding & Fact Check APIs
│       ├── media_parser.py         # Article body scraping & social media oEmbed parser
│       ├── image_forensics.py      # EXIF metadata, ELA compression, AI markers & imagehash
│       ├── domain_checker.py       # Domain RDAP age query, satire list & fake news check
│       └── cache_db.py             # SQLAlchemy SQLite cache & history records
├── frontend/
│   ├── package.json                # React 18, Vite, Tailwind CSS, Lucide Icons
│   ├── vite.config.js              # Vite server & API proxy
│   ├── tailwind.config.js          # Tailwind CSS styling & animations
│   ├── src/
│   │   ├── main.jsx                # Application root
│   │   ├── App.jsx                 # Application layout & pipeline state orchestrator
│   │   ├── index.css               # Global styling, rubber-stamp effect & glassmorphism
│   │   └── components/
│   │       ├── Navbar.jsx          # Brand header, health pill & history toggle
│   │       ├── ChatInterface.jsx   # Multi-input ingestion bar & sample viral claims
│   │       ├── CircleToSearchModal.jsx # Interactive Canvas Circle-to-Search cropper
│   │       ├── PipelineProgress.jsx # 4-Stage real-time animated stepper
│   │       ├── VerdictCard.jsx     # Grand verdict badge, confidence meter & claims
│   │       ├── DiffViewer.jsx      # Side-by-side original vs viral context comparison
│   │       ├── HeadlineAuditBanner.jsx # News headline vs article body discrepancy banner
│   │       ├── ShareReceiptModal.jsx # Mobile fact-check receipt card & PNG generator
│   │       └── HistoryDrawer.jsx   # Verification history & cache browser
├── uploads/                        # Local storage for uploaded/cropped images
├── .env.example                    # Environment variables template
└── README.md                       # Complete documentation & guide
```

---

## 🚀 Quickstart & Setup Instructions

### Prerequisites
- **Python 3.11+** installed
- **Node.js 18+** and **npm** installed

### Step 1: Environment Setup
Copy the environment template:
```bash
cp .env.example .env
```
Open `.env` and enter your API keys:
```env
# Gemini API Key (Required for live Gemini 2.5 Flash & Pro reasoning)
# Get a free key at: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here

# SerpAPI Key (Optional: for live reverse image origin tracing)
SERPAPI_KEY=your_serpapi_key_here

# Google Fact Check Tools API Key (Optional: for IFCN certified claim reviews)
GOOGLE_FACTCHECK_API_KEY=your_factcheck_api_key_here
```
> **Note:** Sachbot includes a built-in empirical knowledge engine for viral hoaxes (e.g. RBI Rs 2000 GPS chip, NASA Diwali satellite view, UNESCO anthem award, satire news) and graceful offline fallbacks, so you can test the full pipeline immediately even before setting up keys!

---

### Step 2: Backend Setup & Run

1. Activate the Python virtual environment:
   - **Windows:**
     ```powershell
     .\venv\Scripts\activate
     ```
   - **Linux/macOS:**
     ```bash
     source venv/bin/activate
     ```

2. Install dependencies (if setting up fresh):
   ```bash
   pip install -r backend/requirements.txt
   ```

3. Start the FastAPI server with Uvicorn:
   ```bash
   uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
   ```
   The backend API will be available at:
   - API Root: `http://localhost:8000`
   - Swagger Interactive API Docs: `http://localhost:8000/docs`
   - Health Check: `http://localhost:8000/api/health`

---

### Step 3: Frontend Setup & Run

In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Open your browser to:
```
http://localhost:5173
```
*(The Vite development server automatically proxies `/api` and `/uploads` requests to the FastAPI backend at port 8000).*

---

### Step 4: Production Build (Optional)
To build the frontend into optimized static assets served directly by FastAPI:
```bash
cd frontend
npm run build
```
Once built, starting `uvicorn backend.main:app --port 8000` serves both the backend API and the frontend application on `http://localhost:8000`!

---

## 🧪 Testing Sample Viral Claims

Click any of the sample buttons on the ingestion bar:
1. **RBI 2000 Note GPS Chip:**
   - *Input:* "The Reserve Bank of India Rs 2000 currency note contains a Nano GPS Chip that satellites track 120 meters underground."
   - *Verdict:* `FALSE` (99% Confidence). Cites RBI official press releases and IFCN debunks.
2. **NASA Diwali Satellite View:**
   - *Input:* "NASA released a satellite photograph showing India illuminated in brilliant colors on Diwali night."
   - *Verdict:* `MISLEADING / OUT OF CONTEXT` (95% Confidence). Traces origin back to the 2003 NOAA demographic growth composite map with Side-by-Side Diff.
3. **UNESCO Best Anthem Award:**
   - *Input:* "UNESCO has officially declared Jana Gana Mana as the best national anthem in the world."
   - *Verdict:* `FALSE` (98% Confidence). UNESCO confirms no such award category exists.
4. **Satire News Detection:**
   - *Input:* `https://www.theonion.com/scientists-successfully-teach-gorilla-to-complain-about-1851458923`
   - *Verdict:* `MISLEADING / OUT OF CONTEXT` (98% Confidence). Identifies *The Onion* as an established parody publication.

---

## 🛡️ License & Acknowledgements
Built with Google Gemini API, FastAPI, React, and Tailwind CSS. Dedicated to combating viral misinformation and restoring empirical truth across digital media.
