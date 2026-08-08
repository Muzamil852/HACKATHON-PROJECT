# CIVIC RADAR
## AI-Powered Civic Intelligence & Response Platform

> Transform citizen reports into city-level intelligence. Detect patterns. Prioritize action. Recommend solutions.

![CIVIC RADAR](https://img.shields.io/badge/CIVIC-RADAR-6366f1?style=for-the-badge&logo=radar&logoColor=white)
![Python](https://img.shields.io/badge/Python-3.11+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=black)
![Gemini AI](https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google&logoColor=white)

---

## 🎯 Problem

Cities receive thousands of citizen complaints daily — potholes, water leaks, garbage overflow, broken streetlights. These reports arrive as unstructured text, making it hard to:
- Understand the **real severity** of each issue
- Detect when multiple reports indicate a **larger problem**
- Route complaints to the **right department**
- Prioritize **what needs attention first**

Traditional systems treat each complaint as an isolated ticket. **CIVIC RADAR treats them as intelligence signals.**

## 💡 Solution

CIVIC RADAR is an AI-powered platform that:

1. **Understands** citizen reports using multimodal AI (text + images)
2. **Classifies** complaints by category, priority, and department
3. **Detects duplicates** using TF-IDF similarity + geographic proximity
4. **Identifies hotspots** — areas where complaints cluster into emerging civic events
5. **Scores actions** — prioritizes what administrators should address first
6. **Recommends** departments and specific actions
7. **Provides intelligence** — answers admin questions grounded in real data

---

## 🏗️ Architecture

```
CITIZEN REPORT
      ↓
┌─────────────────┐
│   FastAPI Backend │
│                   │
│  ┌─────────────┐ │     ┌──────────────┐
│  │  AI Engine   │←┼────→│  Gemini API   │
│  │  (Analyzer)  │ │     └──────────────┘
│  └─────────────┘ │
│  ┌─────────────┐ │
│  │ Similarity   │ │     ┌──────────────┐
│  │ Service      │←┼────→│  scikit-learn │
│  └─────────────┘ │     │  (TF-IDF)    │
│  ┌─────────────┐ │     └──────────────┘
│  │ Hotspot      │ │
│  │ Service      │ │
│  └─────────────┘ │
│  ┌─────────────┐ │
│  │ Analytics    │ │
│  │ Service      │ │     ┌──────────────┐
│  └─────────────┘ │     │   SQLite /    │
│         ↕        │←───→│  PostgreSQL   │
└─────────────────┘     └──────────────┘
      ↕
┌─────────────────┐
│  React Frontend  │
│  Vite + Tailwind │
│  Leaflet Maps    │
│  Framer Motion   │
│  Recharts        │
└─────────────────┘
```

## ✨ Key Features

### 🛡️ Civic Radar (Signature Feature)
Detects when individual complaints form a larger pattern — e.g., 12 water-related reports in Sector 7 aren't 12 separate issues, they're one emerging infrastructure failure.

### 🤖 AI Engine
- **Multimodal analysis** — understands text and images
- **Structured output** — category, priority, department, confidence, reasoning
- **Automatic fallback** — keyword-based classification when AI is unavailable
- **Explainability** — every decision includes reasoning

### 🗺️ Interactive Intelligence Map
- Real-time complaint markers colored by priority
- Pulsing hotspot overlays
- Click-to-inspect intelligence panels
- Category and priority filtering

### 📊 Analytics Center
- Statistical analysis with explanations (mean, median, std dev, quartiles)
- Trend visualization
- Department workload analysis
- Resolution time tracking

### 🎯 Action Queue
AI-scored prioritization based on severity, related reports, growth rate, and duration.

---

## 🛠️ Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | React 18 + Vite | Fast SPA with HMR |
| Styling | Tailwind CSS | Utility-first design system |
| Animation | Framer Motion | Purposeful micro-animations |
| Maps | React Leaflet | Interactive civic intelligence map |
| Charts | Recharts | Data visualization |
| Icons | Lucide React | Consistent icon system |
| Backend | FastAPI | Async Python API |
| Validation | Pydantic | Request/response validation |
| ORM | SQLAlchemy | Database abstraction |
| Database | SQLite | Zero-config local development |
| AI | Google Gemini | Multimodal text + image analysis |
| ML | scikit-learn | TF-IDF similarity, clustering |

---

## 🚀 Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- Google Gemini API key

### Backend Setup
```bash
cd backend
pip install -r requirements.txt

# Create .env from template
cp .env.example .env
# Add your GEMINI_API_KEY to .env

# Seed demo data
python seed.py

# Start backend
uvicorn main:app --reload --port 8000
```

### Frontend Setup
```bash
cd frontend
npm install

# Start frontend
npm run dev
```

Open http://localhost:5173

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/complaints` | Submit a complaint |
| `GET` | `/complaints` | List complaints (filtered) |
| `GET` | `/complaints/{id}` | Get complaint detail |
| `PATCH` | `/complaints/{id}` | Update complaint |
| `POST` | `/complaints/{id}/analyze` | Trigger AI analysis |
| `GET` | `/dashboard/summary` | Dashboard KPIs |
| `GET` | `/dashboard/analytics` | Full analytics |
| `GET` | `/hotspots` | Detected hotspots |
| `GET` | `/incidents` | Linked incidents |
| `POST` | `/incidents/link` | Link complaints |
| `POST` | `/ai/query` | AI Command Center |

---

## 🤖 AI Workflow

```
Input: complaint text + optional image + location
                    ↓
        ┌───────────────────┐
        │   Gemini API      │
        │   (multimodal)    │
        └───────────────────┘
                    ↓
        Structured JSON Output:
        {
          "category": "WATER",
          "priority": "HIGH",
          "summary": "...",
          "recommended_department": "Water & Drainage",
          "confidence": 0.89,
          "reasoning": "..."
        }
                    ↓
        Pydantic Validation
                    ↓
        Store + Similarity Check + Hotspot Update
```

### AI Limitations
- AI classifications are recommendations, not definitive decisions
- Confidence scores indicate AI certainty, not ground truth
- Image analysis may miss context not visible in photos
- All AI decisions can be overridden by administrators
- Fallback system uses keyword matching (lower accuracy)

---

## 📐 OOP Architecture

| Class | Responsibility |
|-------|---------------|
| `Complaint` | Data model for citizen reports |
| `Department` | Civic department entity |
| `Incident` | Groups related complaints |
| `AIAnalyzer` | AI classification engine |
| `FallbackAnalyzer` | Deterministic fallback |
| `SimilarityService` | Duplicate/related detection |
| `HotspotService` | Geographic hotspot detection |
| `AnalyticsService` | Statistical calculations |
| `ActionService` | Action scoring/prioritization |

---

## 📊 Statistics

All statistics are calculated from real stored data:
- **Mean, Median, Mode** — central tendency of resolution times
- **Standard Deviation, Variance** — spread of response times
- **Quartiles, IQR** — distribution analysis
- **Min, Max, Range** — boundary values
- Statistics include plain-language explanations

---

## 🔒 Security
- API keys stored in environment variables only
- `.env` excluded from version control
- Input validation on all endpoints
- No hardcoded credentials

---

## 🧪 Testing

```bash
cd backend
python -m pytest tests/ -v
```

Test coverage includes:
- Complaint validation and creation
- AI JSON parsing and fallback
- Similarity detection
- Hotspot calculation
- Statistics accuracy
- API endpoint responses
- Status update workflows

---

## 📄 License

Built for SMIT Hackathon 2026.
