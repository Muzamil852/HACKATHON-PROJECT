"""Department Contact Directory & Dispatch API Router."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

from database import get_db
from models import Department, Complaint, DispatchLog

router = APIRouter()

# Default Canonical Department Directory
DEFAULT_DEPARTMENTS = [
    {
        "name": "Electrical Services",
        "code": "ELECTRICAL",
        "control_room": "Emergency Electrical Control Room",
        "phone": "+92-21-9920-1111 (DEMO)",
        "email": "dispatch.elec@civicradar.gov",
        "emergency_phone": "1122 / +92-21-9920-1122",
        "operating_hours": "24/7 Operational",
        "availability_status": "AVAILABLE",
        "description": "Manages high-voltage powerlines, fallen wires, transformer hazards, and streetlight grids.",
    },
    {
        "name": "Water & Drainage",
        "code": "WATER_DRAINAGE",
        "control_room": "Hydraulic Control Room (KWSB)",
        "phone": "+92-21-9920-2222 (DEMO)",
        "email": "dispatch.water@civicradar.gov",
        "emergency_phone": "1122 / +92-21-9920-2233",
        "operating_hours": "24/7 Operational",
        "availability_status": "AVAILABLE",
        "description": "Handles water supply leaks, main line bursts, sewage overflow, and drainage blockage.",
    },
    {
        "name": "Waste Management",
        "code": "WASTE_MGMT",
        "control_room": "Sanitation Control Room (SSWMA)",
        "phone": "+92-21-9920-3333 (DEMO)",
        "email": "dispatch.waste@civicradar.gov",
        "emergency_phone": "+92-21-9920-3344",
        "operating_hours": "06:00 - 22:00 Operational",
        "availability_status": "AVAILABLE",
        "description": "Oversees garbage collection, commercial dumping clearance, and drain debris removal.",
    },
    {
        "name": "Roads & Infrastructure",
        "code": "ROADS_INFRA",
        "control_room": "Works & Infrastructure Control Room",
        "phone": "+92-21-9920-4444 (DEMO)",
        "email": "dispatch.roads@civicradar.gov",
        "emergency_phone": "+92-21-9920-4455",
        "operating_hours": "24/7 Operational",
        "availability_status": "AVAILABLE",
        "description": "Manages asphalt patching, pothole repairs, traffic signal restoration, and street curbing.",
    },
    {
        "name": "Public Safety",
        "code": "PUBLIC_SAFETY",
        "control_room": "Civil Safety Emergency Directorate",
        "phone": "+92-21-9920-5555 (DEMO)",
        "email": "dispatch.safety@civicradar.gov",
        "emergency_phone": "15 / 1122",
        "operating_hours": "24/7 Operational",
        "availability_status": "AVAILABLE",
        "description": "Coordinates structural hazard cordons, civil defense, and open manhole hazard barriers.",
    },
    {
        "name": "Municipal Services",
        "code": "MUNICIPAL_SVC",
        "control_room": "District Municipal Control Room (DMC)",
        "phone": "+92-21-9920-6666 (DEMO)",
        "email": "dispatch.municipal@civicradar.gov",
        "emergency_phone": "+92-21-9920-6677",
        "operating_hours": "08:00 - 20:00 Operational",
        "availability_status": "AVAILABLE",
        "description": "Maintains public facilities, park infrastructure, and district municipal operations.",
    },
    {
        "name": "General Administration",
        "code": "GEN_ADMIN",
        "control_room": "Municipal Admin Secretariat",
        "phone": "+92-21-9920-7777 (DEMO)",
        "email": "dispatch.admin@civicradar.gov",
        "emergency_phone": "+92-21-9920-7788",
        "operating_hours": "09:00 - 17:00 Operational",
        "availability_status": "AVAILABLE",
        "description": "Handles encroachment notices, administrative audits, and unclassified civic reports.",
    },
]


def ensure_departments_seeded(db: Session):
    """Seed canonical department directory if missing."""
    count = db.query(Department).count()
    if count == 0:
        for d_data in DEFAULT_DEPARTMENTS:
            dept = Department(
                name=d_data["name"],
                code=d_data["code"],
                control_room=d_data["control_room"],
                phone=d_data["phone"],
                email=d_data["email"],
                emergency_phone=d_data["emergency_phone"],
                operating_hours=d_data["operating_hours"],
                availability_status=d_data["availability_status"],
                description=d_data["description"],
            )
            db.add(dept)
        db.commit()


# Pydantic Schemas
class DepartmentResponse(BaseModel):
    id: str
    name: str
    code: str
    control_room: str
    phone: str
    email: str
    emergency_phone: str
    operating_hours: str
    availability_status: str
    description: Optional[str] = None
    active: bool = True

    class Config:
        from_attributes = True


class DispatchCreateRequest(BaseModel):
    action_type: str  # DISPATCH_EMERGENCY, CONTACT_INITIATED, DETAILS_SENT
    department_name: Optional[str] = None
    notes: Optional[str] = None
    include_reporter_contact: bool = False
    initiated_by: str = "Administrator"


class DispatchLogResponse(BaseModel):
    dispatch_id: str
    complaint_id: str
    department_name: str
    action_type: str
    status: str
    initiated_by: str
    include_reporter_contact: bool
    notes: Optional[str] = None
    timestamp: datetime

    class Config:
        from_attributes = True


class DispatchActionResponse(BaseModel):
    status: str  # DISPATCH_REQUEST_CREATED, CONTACTED, SENT
    dispatch_id: str
    complaint_id: str
    department_name: str
    action_type: str
    timestamp: str
    message: str
    department_contact: Dict[str, Any]


@router.get("/", response_model=List[DepartmentResponse])
def get_departments(db: Session = Depends(get_db)):
    """Get canonical department contact directory."""
    ensure_departments_seeded(db)
    return db.query(Department).filter(Department.active == True).all()


@router.get("/{name_or_code}", response_model=DepartmentResponse)
def get_department_by_name(name_or_code: str, db: Session = Depends(get_db)):
    """Get department contact by exact name or code."""
    ensure_departments_seeded(db)
    q = name_or_code.strip().lower()
    
    # Try exact match first
    dept = db.query(Department).filter(
        (Department.name.ilike(f"%{q}%")) | (Department.code.ilike(f"%{q}%"))
    ).first()

    if not dept:
        # Fallback to general admin
        dept = db.query(Department).filter(Department.code == "GEN_ADMIN").first()

    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    return dept


@router.post("/complaints/{complaint_id}/dispatch", response_model=DispatchActionResponse)
def create_dispatch_action(complaint_id: str, data: DispatchCreateRequest, db: Session = Depends(get_db)):
    """Record dispatch request or contact action and update complaint timeline status."""
    ensure_departments_seeded(db)
    complaint = db.query(Complaint).filter(Complaint.complaint_id == complaint_id).first()

    if not complaint:
        raise HTTPException(status_code=404, detail="Complaint not found")

    # Determine department name
    dept_name = data.department_name or complaint.recommended_department or complaint.assigned_department or "General Administration"
    dept_obj = db.query(Department).filter(Department.name.ilike(f"%{dept_name}%")).first()

    if not dept_obj:
        dept_obj = db.query(Department).filter(Department.code == "GEN_ADMIN").first()

    dept_contact = {
        "name": dept_obj.name if dept_obj else dept_name,
        "control_room": dept_obj.control_room if dept_obj else "Control Room",
        "phone": dept_obj.phone if dept_obj else "+92-21-9920-1111 (DEMO)",
        "email": dept_obj.email if dept_obj else "control@civicradar.gov",
        "availability_status": dept_obj.availability_status if dept_obj else "AVAILABLE",
    }

    # Action Status
    if data.action_type == "DISPATCH_EMERGENCY":
        status = "DISPATCH_REQUEST_CREATED"
        msg = f"Dispatch Request Created for {dept_contact['name']}."
        # Update complaint status to ASSIGNED if currently OPEN
        if complaint.status == "OPEN":
            complaint.status = "ASSIGNED"
            complaint.assigned_department = dept_contact['name']
    elif data.action_type == "CONTACT_INITIATED":
        status = "CONTACTED"
        msg = f"Contact initiated with {dept_contact['name']} Control Room."
    else:
        status = "SENT"
        msg = f"Structured incident details sent to {dept_contact['name']}."

    complaint.updated_at = datetime.now(timezone.utc)

    log_entry = DispatchLog(
        complaint_id=complaint.complaint_id,
        department_name=dept_contact['name'],
        action_type=data.action_type,
        status=status,
        initiated_by=data.initiated_by,
        include_reporter_contact=data.include_reporter_contact,
        notes=data.notes or msg,
        timestamp=datetime.now(timezone.utc),
    )

    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)

    return DispatchActionResponse(
        status=status,
        dispatch_id=log_entry.dispatch_id,
        complaint_id=complaint.complaint_id,
        department_name=dept_contact['name'],
        action_type=data.action_type,
        timestamp=log_entry.timestamp.strftime("%Y-%m-%d %H:%M:%S UTC"),
        message=msg,
        department_contact=dept_contact,
    )


@router.get("/complaints/{complaint_id}/dispatch-logs", response_model=List[DispatchLogResponse])
def get_dispatch_logs(complaint_id: str, db: Session = Depends(get_db)):
    """Get all recorded dispatch and contact logs for a complaint."""
    return db.query(DispatchLog).filter(DispatchLog.complaint_id == complaint_id).order_by(DispatchLog.timestamp.desc()).all()
