"""CivicNova AI — FastAPI Application Entry Point."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import engine, Base
from routers import complaints, dashboard, analytics, hotspots, incidents, ai_query, auth, notifications, departments
from config import settings
import os

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="CivicNova AI API",
    description="Every Report. Smarter Decisions. Better Cities. AI-Powered Civic Intelligence & Response Platform",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "https://civic-nova-ai.onrender.com",
    ] + ([o.strip() for o in settings.ALLOWED_ORIGINS.split(",") if o.strip()] if settings.ALLOWED_ORIGINS else []),
    allow_origin_regex=r"https://.*\.netlify\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Uploads
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Routes
app.include_router(auth.router, prefix="/auth", tags=["Auth"])
app.include_router(notifications.router, prefix="/notifications", tags=["Notifications"])
app.include_router(complaints.router, prefix="/complaints", tags=["Complaints"])
app.include_router(dashboard.router, prefix="/dashboard", tags=["Dashboard"])
app.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
app.include_router(hotspots.router, prefix="/hotspots", tags=["Hotspots"])
app.include_router(incidents.router, prefix="/incidents", tags=["Incidents"])
app.include_router(ai_query.router, prefix="/ai", tags=["AI Command Center"])
app.include_router(departments.router, prefix="/departments", tags=["Departments"])


@app.get("/")
def root():
    return {
        "app": "CivicNova AI",
        "tagline": "Every Report. Smarter Decisions. Better Cities.",
        "status": "running",
        "version": "2.0.0",
    }


@app.get("/health")
def health():
    return {"status": "ok"}
