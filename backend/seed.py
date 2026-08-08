"""Seed realistic demo data for CIVIC RADAR."""
import random
import uuid
from datetime import datetime, timedelta, timezone
from database import SessionLocal, engine, Base
from models import Complaint, Department, Incident

random.seed(42)


def rand_offset(center, spread=0.004):
    return center + random.uniform(-spread, spread)


def hours_ago(h):
    return datetime.now(timezone.utc) - timedelta(hours=h)


def days_ago(d, h=0):
    return datetime.now(timezone.utc) - timedelta(days=d, hours=h)


DEPARTMENTS = [
    ("Water & Drainage", "WATER_DRAINAGE", "Handles water supply, drainage, and sewage complaints"),
    ("Roads & Infrastructure", "ROADS", "Manages road maintenance, potholes, and traffic signals"),
    ("Waste Management", "WASTE", "Oversees garbage collection, dumping, and recycling"),
    ("Electrical Services", "ELECTRICAL", "Manages streetlights, power lines, and electrical hazards"),
    ("Public Safety", "SAFETY", "Police, fire, and emergency response coordination"),
    ("Municipal Services", "MUNICIPAL", "General public infrastructure and civic services"),
    ("Parks & Recreation", "PARKS", "Maintains public parks, gardens, and recreational areas"),
    ("General Administration", "ADMIN", "Catch-all for unclassified complaints"),
]

# ── Complaint data grouped by scenario ─────────────────────────────

# Water cluster in Gulshan-e-Iqbal (10 reports, most recent 3 days)
WATER_CLUSTER = [
    ("Large water leak flooding the road near Gulshan Chowrangi. Traffic heavily affected.", "CRITICAL", hours_ago(4)),
    ("Pipeline burst near Gulshan Block 7. Water gushing onto main road for hours.", "HIGH", hours_ago(8)),
    ("Sewage water overflowing from manhole near Gulshan market. Terrible smell.", "HIGH", hours_ago(12)),
    ("Water supply completely cut off in Gulshan Block 5 since yesterday morning.", "HIGH", hours_ago(18)),
    ("Road flooded near Gulshan-e-Iqbal due to broken water main. Cars stuck.", "HIGH", days_ago(1)),
    ("Continuous water leakage from underground pipe near Gulshan graveyard.", "MEDIUM", days_ago(1, 6)),
    ("Standing water on road causing mosquito breeding near Gulshan Block 13.", "MEDIUM", days_ago(2)),
    ("Water pressure very low in Gulshan Block 4. Barely any water from taps.", "MEDIUM", days_ago(2, 12)),
    ("Dirty water coming from taps in Gulshan Block 10 area. Not safe to drink.", "HIGH", days_ago(3)),
    ("Drainage blocked near Gulshan school causing waterlogging after rain.", "MEDIUM", days_ago(5)),
]

# Road damage cluster near Saddar (6 reports)
ROAD_CLUSTER = [
    ("Massive pothole on MA Jinnah Road near Saddar. Multiple vehicles damaged.", "HIGH", days_ago(2)),
    ("Road surface completely broken on Preedy Street, Saddar. Very dangerous at night.", "HIGH", days_ago(3)),
    ("Traffic signal not working at Empress Market intersection. Causing accidents.", "HIGH", days_ago(4)),
    ("Large crack in road near Saddar bus stop. Getting wider every day.", "MEDIUM", days_ago(5)),
    ("Footpath broken and uneven near Zainab Market. Elderly people falling.", "MEDIUM", days_ago(6)),
    ("Speed breaker too high on Abdullah Haroon Road. Damaging car suspensions.", "LOW", days_ago(8)),
]

# Waste increase in North Nazimabad (8 reports)
WASTE_CLUSTER = [
    ("Garbage dump overflowing on main road of North Nazimabad Block C.", "HIGH", days_ago(1)),
    ("Garbage not collected for 5 days in North Nazimabad Block B. Health hazard.", "HIGH", days_ago(1, 12)),
    ("Huge pile of garbage outside North Nazimabad community center.", "MEDIUM", days_ago(2)),
    ("Waste bins completely full and overflowing in North Nazimabad Block D.", "MEDIUM", days_ago(3)),
    ("Dead animal carcass on street in North Nazimabad. Nobody removing it.", "HIGH", days_ago(3, 6)),
    ("Construction debris dumped illegally on North Nazimabad Block A road.", "MEDIUM", days_ago(5)),
    ("Garbage burning in open area of North Nazimabad. Air quality terrible.", "HIGH", days_ago(7)),
    ("Recycling bins missing from North Nazimabad market area.", "LOW", days_ago(10)),
]

# Critical electrical hazard
ELECTRICAL_REPORTS = [
    ("URGENT: High voltage wire fallen and sparking near University Road bus stop. Extreme danger to pedestrians!", "CRITICAL", hours_ago(2)),
    ("Streetlight pole leaning dangerously on Shahrah-e-Faisal near airport.", "HIGH", days_ago(1)),
    ("Complete power outage in PECHS Block 2 for over 8 hours.", "HIGH", days_ago(2)),
    ("Exposed electrical wires hanging from pole in Nazimabad. Children play nearby.", "CRITICAL", days_ago(1, 6)),
    ("Transformer making loud buzzing noise in Clifton Block 5. Smells like burning.", "HIGH", days_ago(3)),
]

# Safety reports
SAFETY_REPORTS = [
    ("Broken boundary wall of empty plot in DHA Phase 2. Suspicious activity at night.", "HIGH", days_ago(4)),
    ("Street harassment increasing near Tariq Road market. Women feel unsafe.", "HIGH", days_ago(6)),
    ("Missing manhole cover on main road in Korangi. Very dangerous especially at night.", "CRITICAL", days_ago(1)),
]

# Public infrastructure
INFRA_REPORTS = [
    ("Park benches broken in Hill Park. Glass pieces scattered on ground.", "MEDIUM", days_ago(5)),
    ("Public toilet at Clifton beach completely non-functional. Very unhygienic.", "HIGH", days_ago(3)),
    ("Bus stop shelter roof collapsed at Nursery Flyover.", "HIGH", days_ago(7)),
    ("Footover bridge near Liaquatabad missing railing. Very unsafe.", "CRITICAL", days_ago(2)),
]

# Resolved complaints (showing system works)
RESOLVED_REPORTS = [
    ("Pothole repaired on Shahra-e-Quaideen after multiple reports.", "ROAD", "MEDIUM", "Roads & Infrastructure", days_ago(12), days_ago(8)),
    ("Garbage cleared from FB Area Block 9 after complaint.", "WASTE", "LOW", "Waste Management", days_ago(10), days_ago(7)),
    ("Streetlight fixed on University Road near NED University.", "ELECTRICITY", "MEDIUM", "Electrical Services", days_ago(9), days_ago(6)),
    ("Water leak on Shaheed-e-Millat Road repaired by KWSB.", "WATER", "HIGH", "Water & Drainage", days_ago(8), days_ago(5)),
    ("Broken drain cover replaced in Gulistan-e-Jauhar Block 13.", "DRAINAGE", "MEDIUM", "Water & Drainage", days_ago(14), days_ago(11)),
    ("Dangerous tree branch removed from Jamshed Road.", "PUBLIC_INFRASTRUCTURE", "HIGH", "Municipal Services", days_ago(7), days_ago(4)),
    ("Traffic signal repaired at Five Star Chowrangi.", "ROAD", "HIGH", "Roads & Infrastructure", days_ago(11), days_ago(9)),
    ("Garbage collection schedule restored for Lines Area.", "WASTE", "MEDIUM", "Waste Management", days_ago(13), days_ago(10)),
    ("Street flooding resolved after drain cleaning in Bath Island.", "DRAINAGE", "HIGH", "Water & Drainage", days_ago(6), days_ago(3)),
    ("Transformer replaced in North Karachi Sector 11-B.", "ELECTRICITY", "CRITICAL", "Electrical Services", days_ago(5), days_ago(2)),
]

# Coordinates
GULSHAN = (24.925, 67.085)
SADDAR = (24.855, 67.025)
NORTH_NAZ = (24.942, 67.035)
UNIV_ROAD = (24.935, 67.105)
DHA = (24.810, 67.050)
CLIFTON = (24.820, 67.030)
PECHS = (24.870, 67.055)
KORANGI = (24.830, 67.110)


def seed_db():
    print("🔄 Dropping and recreating database...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Seed departments
        for name, code, desc in DEPARTMENTS:
            db.add(Department(name=name, code=code, description=desc))
        db.flush()
        print(f"✅ Created {len(DEPARTMENTS)} departments")

        complaints = []

        # Water cluster
        for desc, pri, created in WATER_CLUSTER:
            c = Complaint(
                description=desc, category="WATER", priority=pri, status="OPEN",
                latitude=rand_offset(GULSHAN[0]), longitude=rand_offset(GULSHAN[1]),
                location="Gulshan-e-Iqbal, Karachi",
                ai_summary=desc[:100], ai_confidence=round(random.uniform(0.82, 0.97), 2),
                ai_reasoning=f"Water/drainage issue detected. Priority {pri} based on severity indicators.",
                recommended_department="Water & Drainage",
                created_at=created, updated_at=created,
            )
            complaints.append(c)

        # Road cluster
        for desc, pri, created in ROAD_CLUSTER:
            c = Complaint(
                description=desc, category="ROAD", priority=pri, status="OPEN",
                latitude=rand_offset(SADDAR[0]), longitude=rand_offset(SADDAR[1]),
                location="Saddar, Karachi",
                ai_summary=desc[:100], ai_confidence=round(random.uniform(0.80, 0.95), 2),
                ai_reasoning=f"Road/infrastructure issue. Priority {pri} due to traffic and safety impact.",
                recommended_department="Roads & Infrastructure",
                created_at=created, updated_at=created,
            )
            complaints.append(c)

        # Waste cluster
        for desc, pri, created in WASTE_CLUSTER:
            status = "OPEN" if pri in ("HIGH", "CRITICAL") else random.choice(["OPEN", "ASSIGNED"])
            c = Complaint(
                description=desc, category="WASTE", priority=pri, status=status,
                latitude=rand_offset(NORTH_NAZ[0]), longitude=rand_offset(NORTH_NAZ[1]),
                location="North Nazimabad, Karachi",
                ai_summary=desc[:100], ai_confidence=round(random.uniform(0.78, 0.94), 2),
                ai_reasoning=f"Waste management issue. Priority {pri} based on health and sanitation indicators.",
                recommended_department="Waste Management",
                created_at=created, updated_at=created,
            )
            complaints.append(c)

        # Electrical
        for desc, pri, created in ELECTRICAL_REPORTS:
            c = Complaint(
                description=desc, category="ELECTRICITY", priority=pri,
                status="OPEN" if pri == "CRITICAL" else "ASSIGNED",
                latitude=rand_offset(UNIV_ROAD[0], 0.01), longitude=rand_offset(UNIV_ROAD[1], 0.01),
                location="University Road / Shahrah-e-Faisal, Karachi",
                ai_summary=desc[:100], ai_confidence=round(random.uniform(0.88, 0.99), 2),
                ai_reasoning=f"Electrical hazard. {pri} priority due to immediate safety risk.",
                recommended_department="Electrical Services",
                created_at=created, updated_at=created,
            )
            complaints.append(c)

        # Safety
        for desc, pri, created in SAFETY_REPORTS:
            c = Complaint(
                description=desc, category="SAFETY", priority=pri, status="ASSIGNED",
                latitude=rand_offset(DHA[0], 0.02), longitude=rand_offset(DHA[1], 0.02),
                location="DHA / Korangi, Karachi",
                ai_summary=desc[:100], ai_confidence=round(random.uniform(0.75, 0.92), 2),
                ai_reasoning=f"Public safety concern. {pri} priority.",
                recommended_department="Public Safety",
                created_at=created, updated_at=created,
            )
            complaints.append(c)

        # Infrastructure
        for desc, pri, created in INFRA_REPORTS:
            c = Complaint(
                description=desc, category="PUBLIC_INFRASTRUCTURE", priority=pri, status="IN_PROGRESS",
                latitude=rand_offset(CLIFTON[0], 0.03), longitude=rand_offset(CLIFTON[1], 0.03),
                location="Clifton / Liaquatabad, Karachi",
                ai_summary=desc[:100], ai_confidence=round(random.uniform(0.72, 0.90), 2),
                ai_reasoning=f"Infrastructure issue. {pri} priority.",
                recommended_department="Municipal Services",
                created_at=created, updated_at=created,
            )
            complaints.append(c)

        # Resolved
        for desc, cat, pri, dept, created, resolved in RESOLVED_REPORTS:
            c = Complaint(
                description=desc, category=cat, priority=pri, status="RESOLVED",
                latitude=rand_offset(PECHS[0], 0.04), longitude=rand_offset(PECHS[1], 0.04),
                location="Various locations, Karachi",
                assigned_department=dept,
                ai_summary=desc[:100], ai_confidence=round(random.uniform(0.80, 0.95), 2),
                ai_reasoning=f"Resolved {cat} complaint.",
                recommended_department=dept,
                created_at=created, updated_at=resolved,
            )
            complaints.append(c)

        # Scatter some random additional complaints
        RANDOM_DESCRIPTIONS = [
            ("Open manhole near Bahadurabad market. Very dangerous.", "DRAINAGE", "HIGH", PECHS),
            ("Stray dogs aggressive in Nazimabad Block 3.", "SAFETY", "MEDIUM", NORTH_NAZ),
            ("Playground equipment broken in Aziz Bhatti Park.", "PUBLIC_INFRASTRUCTURE", "LOW", (24.895, 67.045)),
            ("Water tanker mafia charging double rates in Orangi.", "WATER", "MEDIUM", (24.960, 67.020)),
            ("Road divider missing on Korangi Industrial Road.", "ROAD", "HIGH", KORANGI),
            ("Illegal dumping behind Jinnah Hospital wall.", "WASTE", "MEDIUM", (24.880, 67.050)),
            ("Fallen tree blocking road in Garden area after storm.", "PUBLIC_INFRASTRUCTURE", "HIGH", (24.860, 67.040)),
        ]

        for desc, cat, pri, coords in RANDOM_DESCRIPTIONS:
            c = Complaint(
                description=desc, category=cat, priority=pri,
                status=random.choice(["OPEN", "ASSIGNED", "IN_PROGRESS"]),
                latitude=rand_offset(coords[0], 0.005), longitude=rand_offset(coords[1], 0.005),
                location="Karachi",
                ai_summary=desc[:100], ai_confidence=round(random.uniform(0.70, 0.90), 2),
                ai_reasoning=f"Categorized as {cat} with {pri} priority.",
                recommended_department="General Administration",
                created_at=days_ago(random.randint(1, 12)),
                updated_at=days_ago(random.randint(0, 5)),
            )
            complaints.append(c)

        db.add_all(complaints)
        db.commit()

        total = len(complaints)
        print(f"✅ Seeded {total} complaints")
        print(f"   Water cluster: {len(WATER_CLUSTER)} reports in Gulshan-e-Iqbal")
        print(f"   Road cluster:  {len(ROAD_CLUSTER)} reports in Saddar")
        print(f"   Waste cluster: {len(WASTE_CLUSTER)} reports in North Nazimabad")
        print(f"   Electrical:    {len(ELECTRICAL_REPORTS)} reports")
        print(f"   Safety:        {len(SAFETY_REPORTS)} reports")
        print(f"   Infrastructure:{len(INFRA_REPORTS)} reports")
        print(f"   Resolved:      {len(RESOLVED_REPORTS)} reports")
        print(f"   Random:        {len(RANDOM_DESCRIPTIONS)} reports")
        print(f"\n🟢 Database ready at {engine.url}")

    finally:
        db.close()


if __name__ == "__main__":
    seed_db()
