"""Incident linking & action queue endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from models import Complaint, Incident
from schemas import ActionItem, IncidentCreate, IncidentResponse
from services.action_service import action_service

router = APIRouter()


@router.get("/actions", response_model=List[ActionItem])
def get_action_queue(limit: int = 10, db: Session = Depends(get_db)):
    return action_service.get_action_items(db, limit)


@router.get("/", response_model=List[IncidentResponse])
def list_incidents(db: Session = Depends(get_db)):
    return db.query(Incident).all()


@router.post("/link", response_model=IncidentResponse)
def link_complaints(data: IncidentCreate, db: Session = Depends(get_db)):
    complaints = db.query(Complaint).filter(
        Complaint.complaint_id.in_(data.complaint_ids)
    ).all()
    if not complaints:
        raise HTTPException(400, "No valid complaints found")

    incident = Incident(
        title=data.title,
        category=complaints[0].category,
        area=complaints[0].location or "Unknown",
        report_count=len(complaints),
        severity="HIGH" if any(c.priority in ("CRITICAL", "HIGH") for c in complaints) else "MODERATE",
    )
    db.add(incident)
    db.flush()

    for c in complaints:
        c.related_incident_id = incident.incident_id
    db.commit()
    db.refresh(incident)
    return incident


@router.get("/{incident_id}", response_model=IncidentResponse)
def get_incident(incident_id: str, db: Session = Depends(get_db)):
    inc = db.query(Incident).filter(Incident.incident_id == incident_id).first()
    if not inc:
        raise HTTPException(404, "Incident not found")
    return inc
