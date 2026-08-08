"""Analytics and statistics service."""
import statistics as stats_lib
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from models import Complaint
from schemas import AnalyticsResponse


class AnalyticsService:
    """Calculates comprehensive civic statistics from complaint data."""

    def get_analytics(self, db: Session) -> AnalyticsResponse:
        complaints = db.query(Complaint).all()

        cat_dist = {}
        pri_dist = {}
        stat_dist = {}
        dept_dist = {}
        daily_trends = {}
        hourly_dist = {f"{i:02d}:00": 0 for i in range(24)}
        resolution_times = []

        for c in complaints:
            cat = c.category or "OTHER"
            cat_dist[cat] = cat_dist.get(cat, 0) + 1

            pri = c.priority or "UNKNOWN"
            pri_dist[pri] = pri_dist.get(pri, 0) + 1

            st = c.status or "UNKNOWN"
            stat_dist[st] = stat_dist.get(st, 0) + 1

            dept = c.recommended_department or "Unassigned"
            dept_dist[dept] = dept_dist.get(dept, 0) + 1

            if c.created_at:
                date_str = c.created_at.strftime("%Y-%m-%d")
                daily_trends[date_str] = daily_trends.get(date_str, 0) + 1
                hour_str = f"{c.created_at.hour:02d}:00"
                hourly_dist[hour_str] += 1

                if c.status == "RESOLVED" and c.updated_at:
                    diff_h = (c.updated_at - c.created_at).total_seconds() / 3600.0
                    if diff_h > 0:
                        resolution_times.append(diff_h)

        # Resolution stats
        res_stats = {}
        if resolution_times:
            res_stats["count"] = len(resolution_times)
            res_stats["mean_hours"] = round(stats_lib.mean(resolution_times), 2)
            res_stats["median_hours"] = round(stats_lib.median(resolution_times), 2)
            res_stats["min_hours"] = round(min(resolution_times), 2)
            res_stats["max_hours"] = round(max(resolution_times), 2)
            res_stats["range_hours"] = round(max(resolution_times) - min(resolution_times), 2)

            if len(resolution_times) > 1:
                res_stats["std_dev"] = round(stats_lib.stdev(resolution_times), 2)
                res_stats["variance"] = round(stats_lib.variance(resolution_times), 2)
            else:
                res_stats["std_dev"] = 0.0
                res_stats["variance"] = 0.0

            if len(resolution_times) >= 4:
                qs = stats_lib.quantiles(resolution_times, n=4)
                res_stats["q1"] = round(qs[0], 2)
                res_stats["q3"] = round(qs[2], 2)
                res_stats["iqr"] = round(qs[2] - qs[0], 2)

            # Plain language explanations
            res_stats["explanation"] = (
                f"Median resolution time is {res_stats['median_hours']} hours, meaning half of "
                f"resolved complaints were completed within approximately {res_stats['median_hours']} hours. "
                f"Average is {res_stats['mean_hours']} hours across {res_stats['count']} resolved complaints."
            )
        else:
            res_stats["message"] = "Not enough resolved complaints for statistics."

        # Sort daily trends by date
        daily_sorted = dict(sorted(daily_trends.items()))

        return AnalyticsResponse(
            category_distribution=cat_dist,
            priority_distribution=pri_dist,
            status_distribution=stat_dist,
            department_workload=dept_dist,
            daily_trends=daily_sorted,
            resolution_stats=res_stats,
            hourly_distribution=hourly_dist,
        )


analytics_service = AnalyticsService()
