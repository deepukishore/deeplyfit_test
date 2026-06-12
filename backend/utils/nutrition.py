MICRONUTRIENT_RDA = {
    "fiber": 28.0,
    "sugar": 50.0,
    "sodium": 2300.0,
    "vitamin_c": 90.0,
    "vitamin_d": 20.0,
    "vitamin_b12": 2.4,
    "iron": 18.0,
    "calcium": 1300.0,
    "potassium": 4700.0,
}


def _value(item, key: str) -> float:
    if isinstance(item, dict):
        return float(item.get(key, 0) or 0)
    return float(getattr(item, key, 0) or 0)


def summarize_micronutrients(items) -> dict:
    totals = {
        key: round(sum(_value(item, key) for item in items), 1)
        for key in MICRONUTRIENT_RDA
    }
    totals["percent_of_rda"] = {
        key: round((totals[key] / target) * 100, 1) if target else 0
        for key, target in MICRONUTRIENT_RDA.items()
    }
    return totals


def summarize_recipe_items(items, multiplier: float = 1.0) -> dict:
    scaled_items = []
    for item in items:
        scaled_items.append({
            "calories": _value(item, "calories") * multiplier,
            "protein": _value(item, "protein") * multiplier,
            "carbs": _value(item, "carbs") * multiplier,
            "fat": _value(item, "fat") * multiplier,
            "fiber": _value(item, "fiber") * multiplier,
            "sugar": _value(item, "sugar") * multiplier,
            "sodium": _value(item, "sodium") * multiplier,
            "vitamin_c": _value(item, "vitamin_c") * multiplier,
            "vitamin_d": _value(item, "vitamin_d") * multiplier,
            "vitamin_b12": _value(item, "vitamin_b12") * multiplier,
            "iron": _value(item, "iron") * multiplier,
            "calcium": _value(item, "calcium") * multiplier,
            "potassium": _value(item, "potassium") * multiplier,
        })

    return {
        "calories": round(sum(item["calories"] for item in scaled_items), 1),
        "protein": round(sum(item["protein"] for item in scaled_items), 1),
        "carbs": round(sum(item["carbs"] for item in scaled_items), 1),
        "fat": round(sum(item["fat"] for item in scaled_items), 1),
        "micronutrients": summarize_micronutrients(scaled_items),
    }
