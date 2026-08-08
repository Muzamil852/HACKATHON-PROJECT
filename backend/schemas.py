from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


# ── Auth Schemas ───────────────────────────────────────────────────

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    token: str
    token_type: str = "bearer"
    user: Dict[str, Any]


# ── Complaint Schemas ──────────────────────────────────────────────

class ComplaintCreate(BaseModel):
    description: str = Field(..., min_length=10, max_length=2000)
    citizen_name: str = Field(..., min_length=2, max_length=100)
    citizen_contact: str = Field(..., min_length=7, max_length=50)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location: Optional[str] = None
    image_path: Optional[str] = None


class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
    assigned_department: Optional[str] = None


class ComplaintResponse(BaseModel):
    complaint_id: str
    description: str
    category: Optional[str] = None
    priority: Optional[str] = None
    status: str = "OPEN"
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    location: Optional[str] = None
    assigned_department: Optional[str] = None
    ai_summary: Optional[str] = None
    ai_confidence: Optional[float] = None
    ai_reasoning: Optional[str] = None
    recommended_department: Optional[str] = None
    related_incident_id: Optional[str] = None
    image_path: Optional[str] = None
    citizen_name: Optional[str] = None
    citizen_contact: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ── AI Schemas ─────────────────────────────────────────────────────

class AIAnalysisResult(BaseModel):
    category: str = "OTHER"
    priority: str = "MEDIUM"
    confidence: float = 0.5
    reasoning: str = ""
    summary: str = ""
    recommended_department: str = "General Administration"
    is_fallback: bool = False


class AIQueryRequest(BaseModel):
    question: str


class AIQueryResponse(BaseModel):
    answer: str
    summary: Optional[str] = None
    key_findings: List[str] = []
    supporting_evidence: List[str] = []
    recommendations: List[str] = []
    confidence: float = 0.85
    supporting_data: Optional[Dict[str, Any]] = None


class BiggestConcern(BaseModel):
    category: str
    raw_category: str
    reason: str
    evidence: List[str] = []
    confidence: float = 0.94


class RecommendedAction(BaseModel):
    text: str
    category: Optional[str] = None
    complaint_ids: List[str] = []


class PriorityActionItem(BaseModel):
    rank: int
    badge: str
    complaint_id: str
    description: str
    location: str
    category: str
    priority: str
    action_score: float
    recommended_action: str


class DailyBriefingResponse(BaseModel):
    generated_at: str
    summary: str
    metrics: Dict[str, int]
    biggest_concern: BiggestConcern
    recommended_action: RecommendedAction
    priority_actions: List[PriorityActionItem] = []


# ── Notification Schemas ───────────────────────────────────────────

class NotificationItem(BaseModel):
    id: str
    type: str  # NEW_REPORT, CRITICAL, HOTSPOT, HIGH_PRIORITY, STATUS_CHANGE
    title: str
    message: str
    category: Optional[str] = None
    priority: Optional[str] = None
    target_type: str  # complaint, hotspot
    target_id: str
    timestamp: str


# ── Dashboard Schemas ──────────────────────────────────────────────

class DashboardSummary(BaseModel):
    total_complaints: int = 0
    critical: int = 0
    high: int = 0
    medium: int = 0
    low: int = 0
    open: int = 0
    assigned: int = 0
    in_progress: int = 0
    resolved: int = 0
    active_hotspots: int = 0
    avg_resolution_hours: Optional[float] = None
    departments_count: int = 0


# ── Analytics Schemas ──────────────────────────────────────────────

class AnalyticsResponse(BaseModel):
    category_distribution: Dict[str, int] = {}
    priority_distribution: Dict[str, int] = {}
    status_distribution: Dict[str, int] = {}
    department_workload: Dict[str, int] = {}
    daily_trends: Dict[str, int] = {}
    resolution_stats: Dict[str, Any] = {}
    hourly_distribution: Dict[str, int] = {}


# ── Hotspot Schemas ────────────────────────────────────────────────

class HotspotResponse(BaseModel):
    id: int
    category: str
    latitude: float
    longitude: float
    area: Optional[str] = None
    radius_meters: float = 500.0
    report_count: int = 0
    critical_count: int = 0
    high_count: int = 0
    severity: str = "MINOR"
    growth_rate: float = 0.0
    recommended_department: Optional[str] = None
    ai_recommendation: Optional[str] = None
    detected_at: Optional[datetime] = None
    complaint_ids: List[str] = []


# ── Similarity Schemas ─────────────────────────────────────────────

class SimilarityResult(BaseModel):
    complaint_id: str
    description_snippet: str = ""
    similarity_score: float = 0.0
    distance_km: Optional[float] = None
    time_diff_hours: float = 0.0
    category_match: bool = False
    combined_score: float = 0.0


# ── Action Schemas ─────────────────────────────────────────────────

class ActionItem(BaseModel):
    complaint_id: str
    description: str
    category: str = "OTHER"
    priority: str = "LOW"
    action_score: float = 0.0
    rank: int = 0
    why_now: List[str] = []
    recommended_action: str = ""


# ── Incident Schemas ───────────────────────────────────────────────

class IncidentCreate(BaseModel):
    title: str
    complaint_ids: List[str]


class IncidentResponse(BaseModel):
    incident_id: str
    title: Optional[str] = None
    category: Optional[str] = None
    area: Optional[str] = None
    report_count: int = 0
    severity: Optional[str] = None
    radius: Optional[float] = None
    ai_recommendation: Optional[str] = None
    detected_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
