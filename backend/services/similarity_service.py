"""Similarity detection using TF-IDF + geographic + temporal proximity."""
import math
from datetime import datetime, timezone
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
from sqlalchemy.orm import Session
from models import Complaint
from schemas import SimilarityResult


def haversine(lat1, lon1, lat2, lon2) -> float:
    """Distance between two coordinates in km."""
    if None in (lat1, lon1, lat2, lon2):
        return float("inf")
    R = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return R * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


class SimilarityService:
    def __init__(self):
        self.vectorizer = TfidfVectorizer(stop_words="english", max_features=5000)

    def find_similar(self, db: Session, target: Complaint, limit: int = 5) -> list:
        others = db.query(Complaint).filter(
            Complaint.complaint_id != target.complaint_id
        ).all()

        if not others:
            return []

        # TF-IDF similarity
        all_texts = [target.description] + [c.description for c in others]
        try:
            tfidf_matrix = self.vectorizer.fit_transform(all_texts)
            cos_scores = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:]).flatten()
        except Exception:
            cos_scores = [0.0] * len(others)

        now = datetime.now(timezone.utc)
        target_time = target.created_at or now
        if target_time.tzinfo is None:
            target_time = target_time.replace(tzinfo=timezone.utc)

        results = []
        for i, c in enumerate(others):
            text_sim = float(cos_scores[i])

            # Geographic distance
            dist = haversine(target.latitude, target.longitude, c.latitude, c.longitude)
            dist_weight = max(0, 1 - (dist / 5.0)) if dist != float("inf") else 0

            # Time proximity
            c_time = c.created_at or now
            if c_time.tzinfo is None:
                c_time = c_time.replace(tzinfo=timezone.utc)
            time_diff_h = abs((target_time - c_time).total_seconds()) / 3600.0
            time_weight = max(0, 1 - (time_diff_h / (24 * 14)))

            # Category match bonus
            cat_match = (target.category and c.category and target.category == c.category)
            cat_bonus = 0.2 if cat_match else 0.0

            combined = (text_sim * 0.4) + (dist_weight * 0.25) + (time_weight * 0.1) + cat_bonus

            if combined > 0.15:
                results.append(SimilarityResult(
                    complaint_id=c.complaint_id,
                    description_snippet=c.description[:80] + ("..." if len(c.description) > 80 else ""),
                    similarity_score=round(text_sim, 3),
                    distance_km=round(dist, 2) if dist != float("inf") else None,
                    time_diff_hours=round(time_diff_h, 1),
                    category_match=bool(cat_match),
                    combined_score=round(combined, 3),
                ))

        results.sort(key=lambda x: x.combined_score, reverse=True)
        return results[:limit]


similarity_service = SimilarityService()
