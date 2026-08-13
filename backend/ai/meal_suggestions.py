import json
import os
import re

import google.generativeai as genai


GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_GEMINI_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-2.5-flash",
]
GEMINI_MODEL = os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODELS[0])


FOOD_CATALOG = [
    # Familiar, affordable meals that are easy to prepare or find across India.
    {"name": "Idli, sambar and chutney", "portion_hint": "3 idlis, 1 cup sambar and 1 tbsp chutney", "calories": 360, "protein": 13, "carbs": 62, "fat": 7, "diet_type": "vegetarian", "tags": ["south indian", "breakfast", "balanced"]},
    {"name": "Dosa with sambar", "portion_hint": "1 plain dosa with 1 cup sambar", "calories": 330, "protein": 10, "carbs": 52, "fat": 9, "diet_type": "vegetarian", "tags": ["south indian", "breakfast", "balanced"]},
    {"name": "Vegetable upma with curd", "portion_hint": "1.5 cups vegetable upma with 1/2 cup curd", "calories": 350, "protein": 11, "carbs": 52, "fat": 11, "diet_type": "vegetarian", "tags": ["south indian", "breakfast", "balanced"]},
    {"name": "Pesarattu with chutney", "portion_hint": "2 pesarattu with 2 tbsp tomato chutney", "calories": 350, "protein": 16, "carbs": 52, "fat": 8, "diet_type": "vegetarian", "tags": ["south indian", "breakfast", "protein"]},
    {"name": "Pongal and sambar", "portion_hint": "1 cup ven pongal with 1 cup sambar", "calories": 390, "protein": 13, "carbs": 58, "fat": 12, "diet_type": "vegetarian", "tags": ["south indian", "balanced"]},
    {"name": "Rice, sambar, poriyal and curd", "portion_hint": "1 cup rice, 1 cup sambar, 1/2 cup poriyal and 1/2 cup curd", "calories": 520, "protein": 18, "carbs": 82, "fat": 13, "diet_type": "vegetarian", "tags": ["south indian", "meal", "balanced"]},
    {"name": "Chapati, dal and sabzi", "portion_hint": "2 chapatis, 1 cup dal and 1 cup vegetable sabzi", "calories": 510, "protein": 22, "carbs": 78, "fat": 13, "diet_type": "vegetarian", "tags": ["meal", "balanced", "protein"]},
    {"name": "Rajma rice with salad", "portion_hint": "1 cup rice, 1 cup rajma and cucumber salad", "calories": 520, "protein": 20, "carbs": 91, "fat": 8, "diet_type": "vegetarian", "tags": ["meal", "balanced"]},
    {"name": "Moong dal khichdi with curd", "portion_hint": "1.5 cups khichdi with 1/2 cup curd", "calories": 390, "protein": 16, "carbs": 62, "fat": 9, "diet_type": "vegetarian", "tags": ["meal", "light", "balanced"]},
    {"name": "Paneer bhurji with roti", "portion_hint": "1 cup paneer bhurji with 2 rotis", "calories": 500, "protein": 29, "carbs": 43, "fat": 24, "diet_type": "vegetarian", "tags": ["meal", "protein"]},
    {"name": "Roasted chana and banana", "portion_hint": "50g roasted chana with 1 small banana", "calories": 270, "protein": 10, "carbs": 51, "fat": 3, "diet_type": "vegetarian", "tags": ["snack", "affordable"]},
    {"name": "Curd, fruit and peanuts", "portion_hint": "1 cup curd, 1 seasonal fruit and 20g peanuts", "calories": 300, "protein": 13, "carbs": 33, "fat": 14, "diet_type": "vegetarian", "tags": ["snack", "balanced"]},
    {"name": "Egg bhurji with roti", "portion_hint": "3-egg bhurji with 2 rotis", "calories": 470, "protein": 29, "carbs": 39, "fat": 22, "diet_type": "non_vegetarian", "tags": ["meal", "protein", "affordable"]},
    {"name": "Egg dosa with sambar", "portion_hint": "1 egg dosa with 1 cup sambar", "calories": 420, "protein": 19, "carbs": 53, "fat": 14, "diet_type": "non_vegetarian", "tags": ["south indian", "breakfast", "balanced"]},
    {"name": "Chicken curry with rice", "portion_hint": "1 cup rice with 1 cup home-style chicken curry", "calories": 520, "protein": 35, "carbs": 55, "fat": 17, "diet_type": "non_vegetarian", "tags": ["meal", "protein", "balanced"]},
    {"name": "Chicken curry with chapati", "portion_hint": "1 cup chicken curry with 2 chapatis and salad", "calories": 500, "protein": 38, "carbs": 42, "fat": 18, "diet_type": "non_vegetarian", "tags": ["meal", "protein", "balanced"]},
    {"name": "Fish curry rice", "portion_hint": "1 cup rice with 1 cup fish curry and vegetables", "calories": 490, "protein": 31, "carbs": 57, "fat": 15, "diet_type": "non_vegetarian", "tags": ["south indian", "meal", "protein"]},
    {"name": "Fish fry with rice and rasam", "portion_hint": "1 medium fish fry, 1 cup rice and 1 cup rasam", "calories": 500, "protein": 34, "carbs": 55, "fat": 17, "diet_type": "non_vegetarian", "tags": ["south indian", "meal", "protein"]},
    {"name": "Chicken biryani with raita", "portion_hint": "1.5 cups chicken biryani with 1/2 cup raita", "calories": 560, "protein": 28, "carbs": 70, "fat": 19, "diet_type": "non_vegetarian", "tags": ["meal", "balanced"]},
    {"name": "Boiled eggs, poha and fruit", "portion_hint": "2 boiled eggs, 1 cup vegetable poha and 1 small fruit", "calories": 430, "protein": 20, "carbs": 54, "fat": 15, "diet_type": "non_vegetarian", "tags": ["breakfast", "balanced", "affordable"]},
    {"name": "Egg curry with rice", "portion_hint": "2 eggs in curry with 1 cup rice and salad", "calories": 470, "protein": 23, "carbs": 55, "fat": 17, "diet_type": "non_vegetarian", "tags": ["meal", "balanced", "affordable"]},
    {"name": "Pepper chicken with dosa", "portion_hint": "100g pepper chicken with 1 plain dosa", "calories": 430, "protein": 30, "carbs": 32, "fat": 20, "diet_type": "non_vegetarian", "tags": ["south indian", "meal", "protein"]},
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
        or "no longer available" in message
        or ("model" in message and "404" in message)
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


def _normalize_excluded_names(exclude_names: list[str] | None) -> set[str]:
    return {
        str(name).strip().casefold()
        for name in (exclude_names or [])
        if str(name).strip()
    }


def _cuisine_for(food: dict) -> str:
    return "south_indian" if "south indian" in food.get("tags", []) else "indian"


def _heuristic_suggestions(
    user,
    summary: dict,
    variant: int = 0,
    exclude_names: list[str] | None = None,
) -> dict:
    remaining = _build_remaining(user, summary)
    all_ranked = sorted(
        FOOD_CATALOG,
        key=lambda food: _score_food(food, remaining),
        reverse=True,
    )
    excluded = _normalize_excluded_names(exclude_names)
    available = [food for food in all_ranked if food["name"].casefold() not in excluded]

    # Guarantee a South Indian choice and both diet types in every set. The
    # regional choice alternates between veg and non-veg on refresh.
    south_indian_diet = "vegetarian" if max(variant, 0) % 2 == 0 else "non_vegetarian"
    opposite_diet = "non_vegetarian" if south_indian_diet == "vegetarian" else "vegetarian"
    south_indian = next(
        (
            food for food in available
            if food["diet_type"] == south_indian_diet and _cuisine_for(food) == "south_indian"
        ),
        next(
            (
                food for food in all_ranked
                if food["diet_type"] == south_indian_diet and _cuisine_for(food) == "south_indian"
            ),
            None,
        ),
    )
    opposite = next(
        (food for food in available if food["diet_type"] == opposite_diet and food != south_indian),
        None,
    )
    ranked = [food for food in (south_indian, opposite) if food]
    ranked.extend(food for food in available if food not in ranked)
    ranked = ranked[:3]

    # This should only be needed if the catalog is reduced or almost entirely
    # excluded by a future client.
    if len(ranked) < 3:
        ranked.extend(
            food for food in all_ranked
            if food not in ranked
        )
        ranked = ranked[:3]

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
            "diet_type": item["diet_type"],
            "cuisine": _cuisine_for(item),
            "reason": reason,
        })

    return {
        "remaining": remaining,
        "summary_text": f"You still need about {focus_text}. Here are familiar South Indian and other everyday choices, with both veg and non-veg options.",
        "suggestions": suggestions,
    }


def _ai_suggestions(
    user,
    summary: dict,
    variant: int = 0,
    exclude_names: list[str] | None = None,
) -> dict | None:
    if not GEMINI_API_KEY:
        return None

    remaining = _build_remaining(user, summary)
    excluded = _normalize_excluded_names(exclude_names)
    excluded_instruction = (
        "Do not suggest any of these meals or close name variations: "
        + ", ".join(sorted(excluded))
        + "."
        if excluded
        else "Choose a varied set of three meals."
    )
    try:
        genai.configure(api_key=GEMINI_API_KEY)
        prompt = f"""
You are helping a fitness user choose the next meal.
Remaining macros for today:
- calories: {remaining['calories']}
- protein: {remaining['protein']}
- carbs: {remaining['carbs']}
- fat: {remaining['fat']}

This is suggestion variation {max(variant, 0)}.
{excluded_instruction}
Use affordable, practical Indian home-style foods, with a preference for common
South Indian meals and sides. Avoid specialty Western ingredients. Include at
least one vegetarian and one non-vegetarian option, and at least one clearly
South Indian meal. In India, meals containing egg, chicken, meat, or fish are
non-vegetarian.
Respond with ONLY valid JSON in this format:
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
      "diet_type": "vegetarian or non_vegetarian",
      "cuisine": "south_indian or indian",
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
        suggestion_names = [
            str(item.get("name", "")).strip().casefold()
            for item in suggestions
        ]
        diet_types = {
            str(item.get("diet_type", "")).strip().casefold()
            for item in suggestions
        }
        cuisines = {
            str(item.get("cuisine", "")).strip().casefold()
            for item in suggestions
        }
        if len(set(suggestion_names)) != 3 or any(
            name in excluded for name in suggestion_names
        ) or not {"vegetarian", "non_vegetarian"}.issubset(diet_types) or "south_indian" not in cuisines:
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
                    "diet_type": str(item.get("diet_type", "vegetarian")).strip().casefold(),
                    "cuisine": str(item.get("cuisine", "indian")).strip().casefold(),
                    "reason": str(item.get("reason", "Good fit for your remaining macros.")),
                }
                for item in suggestions
            ],
        }
    except Exception:
        return None


def build_meal_suggestions(
    user,
    summary: dict,
    variant: int = 0,
    exclude_names: list[str] | None = None,
) -> dict:
    return _ai_suggestions(
        user,
        summary,
        variant=variant,
        exclude_names=exclude_names,
    ) or _heuristic_suggestions(
        user,
        summary,
        variant=variant,
        exclude_names=exclude_names,
    )
