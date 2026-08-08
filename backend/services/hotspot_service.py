"""Hotspot detection using geographic clustering."""
import math
from datetime import datetime, timezone, timedelta
from sqlalchemy.orm import Session
from models import Complaint
from schemas import HotspotResponse


def _haversine(lat1, lon1, lat2, lon2) -> float:
    if None in (lat1, lon1, lat2, lon2):
        return float("inf")
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


DEPT_MAP = {
    "ROAD": "Roads & Infrastructure",
    "WATER": "Water & Drainage",
    "WASTE": "Waste Management",
    "ELECTRICITY": "Electrical Services",
    "DRAINAGE": "Water & Drainage",
    "SAFETY": "Public Safety",
    "PUBLIC_INFRASTRUCTURE": "Municipal Services",
    "OTHER": "General Administration",
}

AREA_NAMES = {
    (24.925, 67.085): "Gulshan-e-Iqbal",
    (24.855, 67.025): "Saddar",
    (24.942, 67.035): "North Nazimabad",
    (24.870, 67.050): "Central Karachi",
}


def _nearest_area(lat, lon):
    best = "Unknown Area"
    best_dist = float("inf")
    for (alat, alon), name in AREA_NAMES.items():
        d = _haversine(lat, lon, alat, alon)
        if d < best_dist:
            best_dist = d
            best = name
    return best


class HotspotService:
    """Detects geographic clusters of complaints."""

    def __init__(self, cluster_radius_km: float = 1.5, min_cluster_size: int = 3):
        self.cluster_radius = cluster_radius_km
        self.min_size = min_cluster_size

    def get_hotspots(self, db: Session) -> list:
        complaints = (
            db.query(Complaint)
            .filter(Complaint.latitude.isnot(None), Complaint.longitude.isnot(None))
            .all()
        )

        if len(complaints) < self.min_size:
            return []

        # Group by category first
        by_category = {}
        for c in complaints:
            cat = c.category or "OTHER"
            by_category.setdefault(cat, []).append(c)

        hotspots = []
        hotspot_id = 0

        for cat, cat_complaints in by_category.items():
            if len(cat_complaints) < self.min_size:
                continue

            # Simple proximity clustering
            visited = set()
            for i, c1 in enumerate(cat_complaints):
                if c1.complaint_id in visited:
                    continue

                cluster = [c1]
                visited.add(c1.complaint_id)

                for j, c2 in enumerate(cat_complaints):
                    if c2.complaint_id in visited:
                        continue
                    dist = _haversine(c1.latitude, c1.longitude, c2.latitude, c2.longitude)
                    if dist <= self.cluster_radius:
                        cluster.append(c2)
                        visited.add(c2.complaint_id)

                if len(cluster) >= self.min_size:
                    hotspot_id += 1
                    hotspots.append(self._build_hotspot(hotspot_id, cat, cluster))

        hotspots.sort(key=lambda h: h.report_count, reverse=True)
        return hotspots

    def _build_hotspot(self, hid: int, category: str, cluster: list) -> HotspotResponse:
        center_lat = sum(c.latitude for c in cluster) / len(cluster)
        center_lon = sum(c.longitude for c in cluster) / len(cluster)

        # Radius
        max_dist = max(
            (_haversine(center_lat, center_lon, c.latitude, c.longitude) for c in cluster),
            default=0.1,
        )
        radius_m = max(max_dist * 1000, 200)

        critical = sum(1 for c in cluster if c.priority == "CRITICAL")
        high = sum(1 for c in cluster if c.priority == "HIGH")

        # Severity
        if critical > 0 or high >= 3:
            severity = "SEVERE"
        elif high > 0 or len(cluster) >= 6:
            severity = "MODERATE"
        else:
            severity = "MINOR"

        # Growth rate
        now = datetime.now(timezone.utc)
        recent = sum(1 for c in cluster if c.created_at and (now - c.created_at.replace(tzinfo=timezone.utc)).days <= 3)
        older = sum(1 for c in cluster if c.created_at and 3 < (now - c.created_at.replace(tzinfo=timezone.utc)).days <= 10)

        if older == 0:
            growth = float(recent) * 100
        else:
            growth = round(((recent - older) / older) * 100, 1)

        dept = DEPT_MAP.get(category, "General Administration")
        area = _nearest_area(center_lat, center_lon)

        rec = f"Investigate cluster of {len(cluster)} {category} complaints in {area}. "
        if critical > 0:
            rec += f"{critical} critical report(s) require immediate attention. "
        if growth > 50:
            rec += f"Reports increasing rapidly (+{growth}%). "
        rec += f"Coordinate with {dept}."

        return HotspotResponse(
            id=hid,
            category=category,
            latitude=round(center_lat, 6),
            longitude=round(center_lon, 6),
            area=area,
            radius_meters=round(radius_m, 0),
            report_count=len(cluster),
            critical_count=critical,
            high_count=high,
            severity=severity,
            growth_rate=growth,
            recommended_department=dept,
            ai_recommendation=rec,
            detected_at=now,
            complaint_ids=[c.complaint_id for c in cluster],
        )


hotspot_service = HotspotService()
