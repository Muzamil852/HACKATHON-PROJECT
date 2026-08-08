"""Dashboard KPI endpoint."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
import statistics as stats_lib
from database import get_db
from models import Complaint
from schemas import DashboardSummary
from services.hotspot_service import hotspot_service

router = APIRouter()


@router.get("/summary", response_model=DashboardSummary)
def dashboard_summary(db: Session = Depends(get_db)):
    complaints = db.query(Complaint).all()
    total = len(complaints)

    priority_counts = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}
    status_counts = {"OPEN": 0, "ASSIGNED": 0, "IN_PROGRESS": 0, "RESOLVED": 0}

    resolution_times = []
    depts = set()

    for c in complaints:
        if c.priority in priority_counts:
            priority_counts[c.priority] += 1
        if c.status in status_counts:
            status_counts[c.status] += 1
        if c.recommended_department:
            depts.add(c.recommended_department)
        if c.status == "RESOLVED" and c.created_at and c.updated_at:
            diff = (c.updated_at - c.created_at).total_seconds() / 3600.0
            if diff > 0:
                resolution_times.append(diff)

    avg_res = round(stats_lib.mean(resolution_times), 1) if resolution_times else None
    hotspots = hotspot_service.get_hotspots(db)

    return DashboardSummary(
        total_complaints=total,
        critical=priority_counts["CRITICAL"],
        high=priority_counts["HIGH"],
        medium=priority_counts["MEDIUM"],
        low=priority_counts["LOW"],
        open=status_counts["OPEN"],
        assigned=status_counts["ASSIGNED"],
        in_progress=status_counts["IN_PROGRESS"],
        resolved=status_counts["RESOLVED"],
        active_hotspots=len(hotspots),
        avg_resolution_hours=avg_res,
        departments_count=len(depts),
    )
