"""Analytics endpoint."""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from schemas import AnalyticsResponse
from services.analytics_service import analytics_service

router = APIRouter()


@router.get("/", response_model=AnalyticsResponse)
def get_analytics(db: Session = Depends(get_db)):
    return analytics_service.get_analytics(db)
