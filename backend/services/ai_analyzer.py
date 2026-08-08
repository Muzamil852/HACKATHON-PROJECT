import json
import base64
import logging
import google.generativeai as genai
from config import settings
from schemas import AIAnalysisResult
from services.fallback_service import (
    fallback_analyze, ELECTRICAL_KEYWORDS, ELECTRICAL_HAZARDS, 
    CATEGORY_KEYWORDS, DEPARTMENT_MAP
)

logger = logging.getLogger(__name__)

VALID_CATEGORIES = [
    "ROAD", "WATER", "WASTE", "ELECTRICITY", "DRAINAGE",
    "SAFETY", "PUBLIC_INFRASTRUCTURE", "OTHER"
]
VALID_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


class AIAnalyzer:
    """Hybrid AI-powered complaint analyzer (Deterministic Rules + Gemini AI + Validation)."""

    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = None
        if self.api_key:
            try:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel(
                    "gemini-2.0-flash",
                    generation_config={"response_mime_type": "application/json"},
                )
            except Exception as e:
                logger.warning(f"Failed to init Gemini: {e}")

    def analyze(self, description: str, image_path: str = None, location: str = None) -> AIAnalysisResult:
        """Analyze a complaint using Hybrid Safety-First Architecture."""
        desc_lower = description.lower()

        # 1. Deterministic High-Confidence Electrical Safety Pre-Check
        elec_matches = sum(1 for kw in ELECTRICAL_KEYWORDS if kw in desc_lower)
        if elec_matches > 0:
            has_hazard = any(hz in desc_lower for hz in ELECTRICAL_HAZARDS)
            if has_hazard or elec_matches >= 2:
                priority = "CRITICAL" if has_hazard else "HIGH"
                return AIAnalysisResult(
                    category="ELECTRICITY",
                    priority=priority,
                    confidence=0.96 if has_hazard else 0.92,
                    reasoning=f"Deterministic Safety Rule: High-voltage/live electrical indicator detected ({elec_matches} match(es)). Priority set to {priority}.",
                    summary=f"Electrical issue: {description[:100]}",
                    recommended_department="Electrical Services",
                    is_fallback=False,
                )

        if not self.model:
            return fallback_analyze(description)

        prompt = self._build_prompt(description, location)

        try:
            contents = [prompt]
            if image_path:
                img_part = self._load_image(image_path)
                if img_part:
                    contents.append(img_part)

            response = self.model.generate_content(contents)
            text = response.text

            # Extract JSON
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()

            data = json.loads(text)
            return self._validate_and_sanitize(description, data)

        except Exception as e:
            logger.error(f"AI analysis failed: {e}")
            return fallback_analyze(description)

    def _build_prompt(self, description: str, location: str = None) -> str:
        return f"""Analyze this civic complaint and return a JSON object.

Complaint: "{description}"
Location: {location or "Not specified"}

Return JSON with exactly these keys:
- "category": one of {VALID_CATEGORIES}
- "priority": one of {VALID_PRIORITIES}
- "confidence": float 0.0-1.0
- "reasoning": brief explanation (2-3 sentences)
- "summary": one-sentence operational summary
- "recommended_department": exact department name from [Electrical Services, Water & Drainage, Waste Management, Roads & Infrastructure, Public Safety, Municipal Services, General Administration]

Priority guide:
- CRITICAL: electrical hazards (wires/sparking/voltage), immediate danger to life/safety, major infrastructure failure
- HIGH: significant disruption, health risk, widespread impact
- MEDIUM: moderate inconvenience, localized issue
- LOW: minor issue, cosmetic, informational"""

    def _load_image(self, image_path: str):
        try:
            with open(image_path, "rb") as f:
                data = base64.b64encode(f.read()).decode("utf-8")
            return {"mime_type": "image/jpeg", "data": data}
        except Exception as e:
            logger.warning(f"Could not load image: {e}")
            return None

    def _validate_and_sanitize(self, description: str, data: dict) -> AIAnalysisResult:
        """Validate AI response and enforce safety overrides for obvious civic hazards."""
        desc_lower = description.lower()
        cat = data.get("category", "OTHER").upper().replace(" ", "_")
        pri = data.get("priority", "MEDIUM").upper()

        # Rule Override 1: Electrical Safety Check
        elec_matches = sum(1 for kw in ELECTRICAL_KEYWORDS if kw in desc_lower)
        if elec_matches > 0 and cat != "ELECTRICITY":
            has_hazard = any(hz in desc_lower for hz in ELECTRICAL_HAZARDS)
            cat = "ELECTRICITY"
            pri = "CRITICAL" if has_hazard else "HIGH"
            dept = "Electrical Services"
            conf = 0.96
            reason = f"Safety Override: Detected electrical indicators ({elec_matches} match(es)). Corrected category to ELECTRICITY and department to Electrical Services."
        
        # Rule Override 2: Water Check
        elif any(kw in desc_lower for kw in CATEGORY_KEYWORDS.get("WATER", [])) and cat not in ["WATER", "DRAINAGE"]:
            cat = "WATER"
            dept = "Water & Drainage"
            conf = 0.94
            reason = "Safety Override: Water/drainage indicators detected."

        # Rule Override 3: Waste Check
        elif any(kw in desc_lower for kw in CATEGORY_KEYWORDS.get("WASTE", [])) and cat != "WASTE":
            cat = "WASTE"
            dept = "Waste Management"
            conf = 0.92
            reason = "Safety Override: Waste management indicators detected."

        # Rule Override 4: Road Check
        elif any(kw in desc_lower for kw in CATEGORY_KEYWORDS.get("ROAD", [])) and cat != "ROAD":
            cat = "ROAD"
            dept = "Roads & Infrastructure"
            conf = 0.92
            reason = "Safety Override: Road infrastructure indicators detected."

        else:
            if cat not in VALID_CATEGORIES:
                cat = "OTHER"
            if pri not in VALID_PRIORITIES:
                pri = "MEDIUM"
            dept = DEPARTMENT_MAP.get(cat, "General Administration")
            conf = min(1.0, max(0.0, float(data.get("confidence", 0.85))))
            reason = data.get("reasoning", "AI classified complaint based on context.")

        return AIAnalysisResult(
            category=cat,
            priority=pri,
            confidence=conf,
            reasoning=reason,
            summary=data.get("summary", description[:100]),
            recommended_department=dept,
            is_fallback=False,
        )


ai_analyzer = AIAnalyzer()
