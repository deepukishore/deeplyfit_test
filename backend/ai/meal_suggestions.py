import json
import os
import re

import google.generativeai as genai


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_GEMINI_MODELS = ["gemini-2.5-flash-lite", "gemini-2.5-flash"]
GEMINI_MODEL = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODELS[0])


FOOD_CATALOG = [
    {"name": "Greek yogurt bowl", "portion_hint": "1 cup nonfat Greek yogurt", "calories": 130, "protein": 23, "carbs": 9, "fat": 0, "tags": ["protein", "light"]},
    {"name": "Grilled chicken", "portion_hint": "150g grilled chicken breast", "calories": 248, "protein": 46, "carbs": 0, "fat": 5, "tags": ["protein", "lean"]},
    {"name": "Protein shake", "portion_hint": "1 scoop whey with water", "calories": 120, "protein": 24, "carbs": 3, "fat": 2, "tags": ["protein", "fast"]},
    {"name": "Cottage cheese", "portion_hint": "1 cup low-fat cottage cheese", "calories": 180, "protein": 24, "carbs": 8, "fat": 5, "tags": ["protein"]},
    {"name": "Eggs and toast", "portion_hint": "2 eggs with 2 slices toast", "calories": 260, "protein": 18, "carbs": 22, "fat": 10, "tags": ["balanced"]},
    {"name": "Oats with banana", "portion_hint": "1 bowl oats plus 1 banana", "calories": 290, "protein": 9, "carbs": 57, "fat": 4, "tags": ["carbs"]},
    {"name": "Rice and chicken", "portion_hint": "1 cup rice with 120g chicken", "calories": 390, "protein": 35, "carbs": 42, "fat": 8, "tags": ["balanced", "meal"]},
    {"name": "Salmon and potatoes", "portion_hint": "120g salmon with roasted potatoes", "calories": 410, "protein": 30, "carbs": 28, "fat": 18, "tags": ["fat", "balanced"]},
    {"name": "Peanut butter toast", "portion_hint": "2 slices toast with 2 tbsp peanut butter", "calories": 320, "protein": 12, "carbs": 28, "fat": 17, "tags": ["fat", "snack"]},
    {"name": "Tuna wrap", "portion_hint": "1 tuna whole-wheat wrap", "calories": 330, "protein": 28, "carbs": 27, "fat": 10, "tags": ["balanced"]},
    {"name": "Apple and almonds", "portion_hint": "1 apple with 20g almonds", "calories": 210, "protein": 5, "carbs": 23, "fat": 11, "tags": ["snack"]},
    {"name": "Turkey sandwich", "portion_hint": "1 turkey sandwich on whole grain bread", "calories": 340, "protein": 29, "carbs": 31, "fat": 9, "tags": ["balanced"]},
]


def _get_gemini_model_names(configured_model: str) -> list[str]:
    model_names = [configured_model]
    for model_name in DEFAULT_GEMINI_MODELS:
        if model_name not in model_names:
            model_names.append(model_name)
    return model_names


def _is_model_unavailable_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return (
        "not found" in message
        or "not supported" in message
        or ("model" in message and "generatecontent" in message and "404" in message)
    )


def _remaining_value(target: float | None, consumed: float) -> float:
    return round(max((target or 0) - consumed, 0), 1)


def _build_remaining(user, summary: dict) -> dict:
    return {
        "calories": _remaining_value(user.calorie_target, summary.get("calories_consumed", 0)),
        "protein": _remaining_value(user.protein_target, summary.get("protein", 0)),
        "carbs": _remaining_value(user.carbs_target, summary.get("carbs", 0)),
        "fat": _remaining_value(user.fat_target, summary.get("fat", 0)),
    }


def _score_food(food: dict, remaining: dict) -> float:
    score = 0.0
    for macro, weight in (("protein", 1.7), ("carbs", 1.2), ("fat", 1.0)):
        needed = remaining.get(macro, 0)
        if needed <= 0:
            continue
        score += min(food[macro], needed) / max(needed, 1) * weight

    calories_remaining = remaining.get("calories", 0)
    if calories_remaining > 0:
        if food["calories"] <= calories_remaining:
            score += 0.8
        else:
            score -= min((food["calories"] - calories_remaining) / max(calories_remaining, 1), 1.5)

    if remaining.get("protein", 0) >= max(remaining.get("carbs", 0), remaining.get("fat", 0)):
        score += food["protein"] / max(food["calories"], 1) * 25

    return score


def _heuristic_suggestions(user, summary: dict) -> dict:
    remaining = _build_remaining(user, summary)
    ranked = sorted(
        FOOD_CATALOG,
        key=lambda food: _score_food(food, remaining),
        reverse=True,
    )[:3]

    focus_parts = []
    if remaining["protein"] > 0:
        focus_parts.append(f"{round(remaining['protein'])}g protein")
    if remaining["carbs"] > 0:
        focus_parts.append(f"{round(remaining['carbs'])}g carbs")
    if remaining["fat"] > 0:
        focus_parts.append(f"{round(remaining['fat'])}g fat")
    focus_text = ", ".join(focus_parts[:2]) if focus_parts else "your targets"

    suggestions = []
    for item in ranked:
        if remaining["protein"] >= remaining["carbs"] and item["protein"] >= item["carbs"]:
            reason = "High-protein pick to close the biggest gap."
        elif remaining["carbs"] > remaining["protein"] and item["carbs"] >= item["protein"]:
            reason = "Useful carb top-up without overshooting too hard."
        elif remaining["fat"] > 0 and item["fat"] >= 10:
            reason = "Adds some healthy fats while staying balanced."
        else:
            reason = "Balanced option that fits the rest of your day well."

        suggestions.append({
            "name": item["name"],
            "portion_hint": item["portion_hint"],
            "calories": item["calories"],
            "protein": item["protein"],
            "carbs": item["carbs"],
            "fat": item["fat"],
            "reason": reason,
        })

    return {
        "remaining": remaining,
        "summary_text": f"You still need about {focus_text}. These next-meal ideas fit that gap best.",
        "suggestions": suggestions,
    }


def _ai_suggestions(user, summary: dict) -> dict | None:
    if not GEMINI_API_KEY:
        return None

    remaining = _build_remaining(user, summary)
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        prompt = f"""
You are helping a fitness user choose the next meal.
Remaining macros for today:
- calories: {remaining['calories']}
- protein: {remaining['protein']}
- carbs: {remaining['carbs']}
- fat: {remaining['fat']}

Use practical, common foods. Respond with ONLY valid JSON in this format:
{{
  "summary_text": "short coaching sentence",
  "suggestions": [
    {{
      "name": "meal name",
      "portion_hint": "concise portion",
      "calories": 0,
      "protein": 0,
      "carbs": 0,
      "fat": 0,
      "reason": "why it fits"
    }}
  ]
}}

Return exactly 3 suggestions.
"""
        response = None
        for model_name in _get_gemini_model_names(GEMINI_MODEL):
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content(prompt)
                break
            except Exception as exc:
                if not _is_model_unavailable_error(exc):
                    raise
        if response is None:
            return None

        text = response.text.strip()
        match = re.search(r"\{.*\}", text, re.DOTALL)
        if not match:
            return None
        data = json.loads(match.group(0))
        suggestions = data.get("suggestions") or []
        if len(suggestions) != 3:
            return None

        return {
            "remaining": remaining,
            "summary_text": data.get("summary_text") or "Here are three meal ideas for the rest of today.",
            "suggestions": [
                {
                    "name": str(item.get("name", "Suggested meal")),
                    "portion_hint": str(item.get("portion_hint", "1 serving")),
                    "calories": float(item.get("calories", 0)),
                    "protein": float(item.get("protein", 0)),
                    "carbs": float(item.get("carbs", 0)),
                    "fat": float(item.get("fat", 0)),
                    "reason": str(item.get("reason", "Good fit for your remaining macros.")),
                }
                for item in suggestions
            ],
        }
    except Exception:
        return None


def build_meal_suggestions(user, summary: dict) -> dict:
    return _ai_suggestions(user, summary) or _heuristic_suggestions(user, summary)
