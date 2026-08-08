"""Notifications endpoint generated from real database complaints and hotspots."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Complaint
from schemas import NotificationItem
from services.hotspot_service import hotspot_service

router = APIRouter()


@router.get("/", response_model=List[NotificationItem])
def get_notifications(db: Session = Depends(get_db)):
    items = []

    # Newest incoming reports
    newest = (
        db.query(Complaint)
        .order_by(Complaint.created_at.desc())
        .limit(5)
        .all()
    )

    for c in newest:
        snippet = c.description[:90] + ("..." if len(c.description) > 90 else "")
        items.append(
            NotificationItem(
                id=f"notif_new_{c.complaint_id[:8]}",
                type="NEW_REPORT",
                title="🔴 NEW REPORT",
                message=f"New civic report received: \"{snippet}\"",
                category=c.category or "General",
                priority=c.priority or "MEDIUM",
                target_type="complaint",
                target_id=c.complaint_id,
                timestamp=c.created_at.strftime("%b %d, %H:%M") if c.created_at else "Just now",
            )
        )

    # Active Hotspots
    hotspots = hotspot_service.get_hotspots(db)
    for h in hotspots[:3]:
        items.append(
            NotificationItem(
                id=f"notif_hs_{h.id}",
                type="HOTSPOT",
                title=f"HOTSPOT DETECTED: {h.category} ({h.area or 'Zone'})",
                message=f"{h.report_count} reports clustered. Growth: +{h.growth_rate}%. Severity: {h.severity}.",
                category=h.category,
                priority="HIGH" if h.severity == "SEVERE" else "MEDIUM",
                target_type="hotspot",
                target_id=str(h.id),
                timestamp="Active Signal",
            )
        )

    # Critical unresolved complaints
    criticals = (
        db.query(Complaint)
        .filter(Complaint.priority == "CRITICAL", Complaint.status != "RESOLVED")
        .order_by(Complaint.created_at.desc())
        .limit(3)
        .all()
    )

    for c in criticals:
        items.append(
            NotificationItem(
                id=f"notif_crit_{c.complaint_id[:8]}",
                type="CRITICAL",
                title=f"CRITICAL: {c.category or 'Civic Hazard'}",
                message=c.description[:100] + ("..." if len(c.description) > 100 else ""),
                category=c.category,
                priority="CRITICAL",
                target_type="complaint",
                target_id=c.complaint_id,
                timestamp=c.created_at.strftime("%b %d, %H:%M") if c.created_at else "Recently",
            )
        )

    return items
