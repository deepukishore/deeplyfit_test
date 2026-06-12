from collections import defaultdict
from datetime import timedelta

from models import FoodLog, WaterLog, WeightLog, Workout


def _daily_food_totals(food_logs):
    totals = defaultdict(lambda: {"calories": 0.0, "protein": 0.0})
    for log in food_logs:
        totals[log.date]["calories"] += log.calories or 0
        totals[log.date]["protein"] += log.protein or 0
    return totals


def _longest_consecutive_streak(activity_dates):
    if not activity_dates:
        return 0

    dates = sorted(set(activity_dates))
    longest = 1
    current = 1

    for previous, next_date in zip(dates, dates[1:]):
        if next_date - previous == timedelta(days=1):
            current += 1
            longest = max(longest, current)
        else:
            current = 1
    return longest


def build_achievements(user, food_logs, water_logs, weight_logs, workouts):
    food_totals = _daily_food_totals(food_logs)
    active_dates = [log.date for log in food_logs] + [log.date for log in water_logs] + [log.date for log in weight_logs] + [log.date for log in workouts]
    streak = _longest_consecutive_streak(active_dates)

    hydration_streak = _longest_consecutive_streak([log.date for log in water_logs if (log.glasses or 0) >= 8])
    protein_days = sum(
        1
        for day_total in food_totals.values()
        if user.protein_target and day_total["protein"] >= user.protein_target
    )
    on_track_streak = _longest_consecutive_streak([
        log_date
        for log_date, day_total in food_totals.items()
        if user.calorie_target and abs(day_total["calories"] - user.calorie_target) <= 100
    ])

    achievements = [
        {
            "key": "streak_7",
            "icon": "🔥",
            "name": "7-day streak",
            "description": "Log something active for 7 days in a row.",
            "unlocked": streak >= 7,
            "progress": {"current": min(streak, 7), "target": 7},
        },
        {
            "key": "hydration_hero",
            "icon": "💧",
            "name": "Hydration Hero",
            "description": "Hit 8 glasses for 5 days in a row.",
            "unlocked": hydration_streak >= 5,
            "progress": {"current": min(hydration_streak, 5), "target": 5},
        },
        {
            "key": "protein_king",
            "icon": "💪",
            "name": "Protein King",
            "description": "Hit your protein goal on 10 days.",
            "unlocked": protein_days >= 10,
            "progress": {"current": min(protein_days, 10), "target": 10},
        },
        {
            "key": "on_track",
            "icon": "⚖️",
            "name": "On Track",
            "description": "Stay within 100 kcal of your goal for a 7-day run.",
            "unlocked": on_track_streak >= 7,
            "progress": {"current": min(on_track_streak, 7), "target": 7},
        },
    ]

    return achievements
