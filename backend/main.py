"""CIVIC RADAR — FastAPI Application Entry Point."""
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
    title="CIVIC RADAR API",
    description="AI-Powered Civic Intelligence & Response Platform",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
    return {"app": "CIVIC RADAR", "status": "running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}
