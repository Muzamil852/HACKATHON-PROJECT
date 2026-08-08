"""Action scoring and prioritization service."""
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models import Complaint
from schemas import ActionItem


PRIORITY_SCORES = {"CRITICAL": 100, "HIGH": 75, "MEDIUM": 50, "LOW": 25}
SAFETY_CATEGORIES = {"SAFETY", "ELECTRICITY"}

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


class ActionService:
    """Calculates action scores and builds prioritized queues."""

    def get_action_items(self, db: Session, limit: int = 10) -> list:
        complaints = (
            db.query(Complaint)
            .filter(Complaint.status.in_(["OPEN", "ASSIGNED", "IN_PROGRESS"]))
            .all()
        )

        now = datetime.now(timezone.utc)
        items = []

        for c in complaints:
            p_score = PRIORITY_SCORES.get(c.priority, 0)
            safety = 100 if c.category in SAFETY_CATEGORIES else 0

            # Duration factor
            created = c.created_at
            if created and created.tzinfo is None:
                created = created.replace(tzinfo=timezone.utc)
            duration_days = (now - (created or now)).days if created else 0
            dur_factor = min(duration_days * 7, 100)

            score = (p_score * 0.35) + (safety * 0.25) + (dur_factor * 0.40)

            reasons = []
            if p_score >= 75:
                reasons.append(f"{c.priority} priority")
            if safety > 0:
                reasons.append("Safety risk identified")
            if duration_days > 3:
                reasons.append(f"Unresolved for {duration_days} days")
            if c.status == "OPEN":
                reasons.append("Not yet assigned")
            if not reasons:
                reasons.append("Standard priority")

            dept = c.recommended_department or DEPT_MAP.get(c.category, "General Administration")

            items.append({
                "complaint": c,
                "score": score,
                "reasons": reasons,
                "dept": dept,
            })

        items.sort(key=lambda x: x["score"], reverse=True)

        results = []
        for rank, item in enumerate(items[:limit], 1):
            c = item["complaint"]
            results.append(ActionItem(
                complaint_id=c.complaint_id,
                description=c.description[:150] + ("..." if len(c.description) > 150 else ""),
                category=c.category or "OTHER",
                priority=c.priority or "LOW",
                action_score=round(item["score"], 1),
                rank=rank,
                why_now=item["reasons"],
                recommended_action=f"Assign to {item['dept']} for immediate investigation",
            ))

        return results


action_service = ActionService()
