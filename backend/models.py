import uuid
from sqlalchemy import Column, String, Float, DateTime, ForeignKey, Integer, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class Complaint(Base):
    __tablename__ = "complaints"

    complaint_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    description = Column(Text, nullable=False)
    category = Column(String, index=True)
    priority = Column(String, index=True)
    status = Column(String, index=True, default="OPEN")
    latitude = Column(Float, index=True)
    longitude = Column(Float, index=True)
    location = Column(String)
    assigned_department = Column(String)
    ai_summary = Column(Text)
    ai_confidence = Column(Float)
    ai_reasoning = Column(Text)
    recommended_department = Column(String)
    related_incident_id = Column(String, ForeignKey("incidents.incident_id"), nullable=True)
    image_path = Column(String, nullable=True)
    citizen_name = Column(String)
    citizen_contact = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    incident = relationship("Incident", back_populates="complaints")
    analysis = relationship("AIAnalysis", back_populates="complaint", uselist=False)
    dispatch_logs = relationship("DispatchLog", back_populates="complaint", order_by="DispatchLog.timestamp.desc()")


class Department(Base):
    __tablename__ = "departments"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, unique=True, index=True)
    code = Column(String, unique=True, index=True)
    control_room = Column(String, default="Control Room")
    phone = Column(String, default="+92-21-99201111")
    email = Column(String, default="control@civicradar.gov")
    emergency_phone = Column(String, default="1122")
    operating_hours = Column(String, default="24/7 Operational")
    availability_status = Column(String, default="AVAILABLE")  # AVAILABLE, BUSY, OFFLINE
    description = Column(String, nullable=True)
    active = Column(Boolean, default=True)


class DispatchLog(Base):
    __tablename__ = "dispatch_logs"

    dispatch_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(String, ForeignKey("complaints.complaint_id"), index=True)
    department_name = Column(String, nullable=False)
    action_type = Column(String, nullable=False)  # DISPATCH_EMERGENCY, CONTACT_INITIATED, DETAILS_SENT
    status = Column(String, default="DISPATCH_REQUEST_CREATED")
    initiated_by = Column(String, default="Administrator")
    include_reporter_contact = Column(Boolean, default=False)
    notes = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)

    complaint = relationship("Complaint", back_populates="dispatch_logs")


class Incident(Base):
    __tablename__ = "incidents"

    incident_id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    title = Column(String)
    category = Column(String, index=True)
    area = Column(String)
    report_count = Column(Integer, default=1)
    severity = Column(String, index=True)
    radius = Column(Float)
    ai_recommendation = Column(Text)
    detected_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    complaints = relationship("Complaint", back_populates="incident")


class AIAnalysis(Base):
    __tablename__ = "ai_analysis"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    complaint_id = Column(String, ForeignKey("complaints.complaint_id"))
    category = Column(String)
    priority = Column(String)
    confidence = Column(Float)
    reasoning = Column(Text)
    summary = Column(Text)
    recommended_department = Column(String)
    is_fallback = Column(Boolean, default=False)
    analyzed_at = Column(DateTime, default=datetime.utcnow)

    complaint = relationship("Complaint", back_populates="analysis")
