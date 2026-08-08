"""Deterministic fallback analyzer when AI API is unavailable."""
import re
from schemas import AIAnalysisResult

ELECTRICAL_KEYWORDS = [
    "electric", "electrical", "electricity", "wire", "wires", "power line", "powerline", 
    "cable", "live wire", "fallen wire", "fallen wires", "high voltage", "high-voltage", 
    "voltage", "voltages", "110v", "220v", "240v", "440v", "660v", "1100v", "1100 volt", 
    "1100 volts", "spark", "sparking", "transformer", "pole", "electric pole", "short circuit", 
    "shock", "electrocution", "blackout", "street light", "streetlights", "streetlight", "light pole"
]

ELECTRICAL_HAZARDS = [
    "fallen", "live", "sparking", "spark", "exposed", "danger", "hazard", 
    "high voltage", "voltage", "short circuit", "electrocution", "fire", "hanging"
]

CATEGORY_KEYWORDS = {
    "ELECTRICITY": ELECTRICAL_KEYWORDS,
    "WATER": ["water", "leak", "leaking", "pipe", "pipeline", "water main", "tap", "water supply", "tanker", "plumbing", "waterlog", "burst"],
    "DRAINAGE": ["drain", "drainage", "gutter", "canal", "nala", "clog", "blocked drain", "storm water", "culvert", "manhole", "sewage", "sewer", "flooding", "flood"],
    "WASTE": ["waste", "garbage", "trash", "rubbish", "dump", "dumped", "bin", "bins", "litter", "sweep", "sweeping", "debris", "stink", "smell", "overflowing", "accumulating"],
    "ROAD": ["road", "pothole", "potholes", "traffic", "signal", "pavement", "bridge", "asphalt", "erosion", "highway", "lane", "footpath", "divider", "speed bump"],
    "SAFETY": ["crime", "theft", "robbery", "danger", "hazard", "unsafe", "police", "fire", "accident", "attack", "violence", "threat", "suspicious", "emergency"],
    "PUBLIC_INFRASTRUCTURE": ["park", "bench", "playground", "sign", "fence", "wall", "building", "construction", "demolish", "encroachment", "footover", "underpass"]
}

DEPARTMENT_MAP = {
    "ROAD": "Roads & Infrastructure",
    "WATER": "Water & Drainage",
    "DRAINAGE": "Water & Drainage",
    "WASTE": "Waste Management",
    "ELECTRICITY": "Electrical Services",
    "SAFETY": "Public Safety",
    "PUBLIC_INFRASTRUCTURE": "Municipal Services",
    "OTHER": "General Administration",
}


def fallback_analyze(description: str) -> AIAnalysisResult:
    """Rule-based analysis using deterministic scoring & keyword matching."""
    desc_lower = description.lower()

    # 1. Deterministic Electrical Safety Pre-Check
    elec_matches = sum(1 for kw in ELECTRICAL_KEYWORDS if kw in desc_lower)
    if elec_matches > 0:
        has_hazard = any(hz in desc_lower for hz in ELECTRICAL_HAZARDS)
        priority = "CRITICAL" if has_hazard else "HIGH"
        return AIAnalysisResult(
            category="ELECTRICITY",
            priority=priority,
            confidence=0.96 if has_hazard else 0.92,
            reasoning=f"Deterministic Safety Rule: Matched {elec_matches} electrical indicator(s). Priority set to {priority}.",
            summary=f"Electrical issue: {description[:100]}",
            recommended_department="Electrical Services",
            is_fallback=True,
        )

    # 2. General Category Keyword Scoring
    scores = {}
    for cat, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in desc_lower)
        if score > 0:
            scores[cat] = score

    if scores:
        best_cat = max(scores, key=scores.get)
        max_score = scores[best_cat]
        category = "WATER" if best_cat == "DRAINAGE" else best_cat
    else:
        best_cat = "OTHER"
        category = "OTHER"
        max_score = 0

    # 3. Priority Calculation
    if any(k in desc_lower for k in ["burst", "explosion", "death", "immediate", "emergency", "fire", "electrocution"]):
        priority = "CRITICAL"
    elif any(k in desc_lower for k in ["flooding", "flood", "hazard", "danger", "pothole", "overflowing", "major", "blocked"]):
        priority = "HIGH"
    elif max_score >= 1:
        priority = "MEDIUM"
    else:
        priority = "LOW"

    department = DEPARTMENT_MAP.get(category, "General Administration")
    summary = description[:120].strip() + ("..." if len(description) > 120 else "")

    return AIAnalysisResult(
        category=category,
        priority=priority,
        confidence=min(0.96, 0.75 + (max_score * 0.08)),
        reasoning=f"Deterministic Rule: Matched {max_score} indicator(s) for {category}.",
        summary=summary,
        recommended_department=department,
        is_fallback=True,
    )
