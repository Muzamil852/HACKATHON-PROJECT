"""Hotspot endpoints."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from schemas import HotspotResponse
from services.hotspot_service import hotspot_service

router = APIRouter()


@router.get("/", response_model=List[HotspotResponse])
def get_hotspots(db: Session = Depends(get_db)):
    return hotspot_service.get_hotspots(db)


@router.get("/{hotspot_id}", response_model=HotspotResponse)
def get_hotspot(hotspot_id: int, db: Session = Depends(get_db)):
    hotspots = hotspot_service.get_hotspots(db)
    for h in hotspots:
        if h.id == hotspot_id:
            return h
    raise HTTPException(404, "Hotspot not found")
