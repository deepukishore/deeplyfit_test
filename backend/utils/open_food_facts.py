import json
from typing import Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import HTTPException


OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
OPEN_FOOD_FACTS_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"
OPEN_FOOD_FACTS_FIELDS = (
    "product_name,product_name_en,generic_name,brands,serving_size,"
    "quantity,image_front_small_url,nutriments"
)
OPEN_FOOD_FACTS_USER_AGENT = "FitTrackAI/1.0 (contact@fittrack.local)"
LOCAL_FOOD_FALLBACKS = [
    {"name": "Paneer", "brand": "Local estimate", "calories": 265, "protein": 18.3, "carbs": 1.2, "fat": 20.8, "fiber": 0, "sugar": 1.2, "sodium": 22, "tags": ["paneer", "cottage cheese"]},
    {"name": "Cooked white rice", "brand": "Local estimate", "calories": 130, "protein": 2.7, "carbs": 28.2, "fat": 0.3, "fiber": 0.4, "sugar": 0.1, "sodium": 1, "tags": ["rice", "white rice", "chawal"]},
    {"name": "Chapati / Roti", "brand": "Local estimate", "calories": 120, "protein": 3.5, "carbs": 18, "fat": 3.7, "fiber": 3, "sugar": 0.5, "sodium": 120, "tags": ["chapati", "roti", "phulka"]},
    {"name": "Boiled egg", "brand": "Local estimate", "calories": 78, "protein": 6.3, "carbs": 0.6, "fat": 5.3, "fiber": 0, "sugar": 0.6, "sodium": 62, "tags": ["egg", "boiled egg"]},
    {"name": "Chicken breast", "brand": "Local estimate", "calories": 165, "protein": 31, "carbs": 0, "fat": 3.6, "fiber": 0, "sugar": 0, "sodium": 74, "tags": ["chicken", "chicken breast"]},
    {"name": "Dal", "brand": "Local estimate", "calories": 116, "protein": 9, "carbs": 20, "fat": 0.4, "fiber": 7.9, "sugar": 1.8, "sodium": 2, "tags": ["dal", "lentil", "lentils"]},
    {"name": "Curd / Yogurt", "brand": "Local estimate", "calories": 61, "protein": 3.5, "carbs": 4.7, "fat": 3.3, "fiber": 0, "sugar": 4.7, "sodium": 46, "tags": ["curd", "yogurt", "dahi"]},
    {"name": "Oats", "brand": "Local estimate", "calories": 389, "protein": 16.9, "carbs": 66.3, "fat": 6.9, "fiber": 10.6, "sugar": 0.9, "sodium": 2, "tags": ["oats", "oatmeal"]},
    {"name": "Banana", "brand": "Local estimate", "calories": 89, "protein": 1.1, "carbs": 22.8, "fat": 0.3, "fiber": 2.6, "sugar": 12.2, "sodium": 1, "tags": ["banana", "kela"]},
]


def _to_float(value) -> Optional[float]:
    try:
        if value in (None, ""):
            return None
        return float(value)
    except (TypeError, ValueError):
        return None


def _pick_value(nutriments: dict, keys: list[str]) -> Tuple[Optional[float], Optional[str]]:
    for key in keys:
        value = _to_float(nutriments.get(key))
        if value is not None:
            return value, key
    return None, None


def _extract_calories(nutriments: dict) -> Tuple[float, str]:
    calories, key = _pick_value(
        nutriments,
        ["energy-kcal_serving", "energy-kcal_value", "energy-kcal_100g", "energy-kcal"],
    )
    if calories is not None:
        return calories, "serving" if "serving" in (key or "") else "100g"

    kj_value, key = _pick_value(
        nutriments,
        ["energy-kj_serving", "energy-kj_value", "energy-kj_100g", "energy-kj"],
    )
    if kj_value is not None:
        return round(kj_value / 4.184, 1), "serving" if "serving" in (key or "") else "100g"

    return 0.0, "unknown"


def _extract_macro(nutriments: dict, base_key: str) -> Tuple[float, str]:
    value, key = _pick_value(
        nutriments,
        [f"{base_key}_serving", f"{base_key}_value", f"{base_key}_100g", base_key],
    )
    if value is None:
        return 0.0, "unknown"
    return value, "serving" if "serving" in (key or "") else "100g"


def _extract_micro(nutriments: dict, keys: list[str]) -> float:
    value, _ = _pick_value(nutriments, keys)
    return round(value or 0.0, 1)


def _normalize_product(product: dict, fallback_name: str) -> dict:
    nutriments = product.get("nutriments") or {}

    calories, calorie_basis = _extract_calories(nutriments)
    protein, protein_basis = _extract_macro(nutriments, "proteins")
    carbs, carbs_basis = _extract_macro(nutriments, "carbohydrates")
    fat, fat_basis = _extract_macro(nutriments, "fat")

    if calorie_basis == "serving" or protein_basis == "serving" or carbs_basis == "serving" or fat_basis == "serving":
        nutrition_basis = "per serving"
    elif calorie_basis == "100g" or protein_basis == "100g" or carbs_basis == "100g" or fat_basis == "100g":
        nutrition_basis = "per 100g"
    else:
        nutrition_basis = "estimated"

    name = (
        product.get("product_name")
        or product.get("product_name_en")
        or product.get("generic_name")
        or fallback_name
    )

    return {
        "code": str(product.get("code") or ""),
        "name": name,
        "brand": product.get("brands"),
        "image_url": product.get("image_front_small_url"),
        "quantity_label": product.get("quantity"),
        "serving_size": product.get("serving_size"),
        "nutrition_basis": nutrition_basis,
        "calories": round(calories, 1),
        "protein": round(protein, 1),
        "carbs": round(carbs, 1),
        "fat": round(fat, 1),
        "fiber": _extract_micro(nutriments, ["fiber_serving", "fiber_value", "fiber_100g", "fiber"]),
        "sugar": _extract_micro(nutriments, ["sugars_serving", "sugars_value", "sugars_100g", "sugars"]),
        "sodium": _extract_micro(nutriments, ["sodium_serving", "sodium_value", "sodium_100g", "sodium"]),
        "vitamin_c": _extract_micro(nutriments, ["vitamin-c_serving", "vitamin-c_value", "vitamin-c_100g", "vitamin-c"]),
        "vitamin_d": _extract_micro(nutriments, ["vitamin-d_serving", "vitamin-d_value", "vitamin-d_100g", "vitamin-d"]),
        "vitamin_b12": _extract_micro(nutriments, ["vitamin-b12_serving", "vitamin-b12_value", "vitamin-b12_100g", "vitamin-b12"]),
        "iron": _extract_micro(nutriments, ["iron_serving", "iron_value", "iron_100g", "iron"]),
        "calcium": _extract_micro(nutriments, ["calcium_serving", "calcium_value", "calcium_100g", "calcium"]),
        "potassium": _extract_micro(nutriments, ["potassium_serving", "potassium_value", "potassium_100g", "potassium"]),
    }


def _local_food_results(query_text: str, page: int, page_size: int) -> dict:
    query_lower = query_text.lower()
    matches = [
        item for item in LOCAL_FOOD_FALLBACKS
        if query_lower in item["name"].lower() or any(query_lower in tag for tag in item["tags"])
    ]
    start = (page - 1) * page_size
    selected = matches[start:start + page_size]
    return {
        "query": query_text,
        "total_results": len(matches),
        "page": page,
        "page_size": page_size,
        "results": [
            {
                "code": f"local-{item['name'].lower().replace(' ', '-').replace('/', '-')}",
                "name": item["name"],
                "brand": item["brand"],
                "image_url": None,
                "quantity_label": "100g estimate",
                "serving_size": "100g",
                "nutrition_basis": "per 100g estimate",
                "calories": item["calories"],
                "protein": item["protein"],
                "carbs": item["carbs"],
                "fat": item["fat"],
                "fiber": item["fiber"],
                "sugar": item["sugar"],
                "sodium": item["sodium"],
                "vitamin_c": 0,
                "vitamin_d": 0,
                "vitamin_b12": 0,
                "iron": 0,
                "calcium": 0,
                "potassium": 0,
            }
            for item in selected
        ],
    }


def fetch_barcode_nutrition(barcode: str) -> dict:
    query = urlencode({"fields": OPEN_FOOD_FACTS_FIELDS})
    url = OPEN_FOOD_FACTS_URL.format(barcode=barcode.strip()) + "?" + query
    request = Request(url, headers={"User-Agent": OPEN_FOOD_FACTS_USER_AGENT})

    try:
        with urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        raise HTTPException(status_code=exc.code, detail="Barcode lookup failed")
    except URLError:
        raise HTTPException(status_code=503, detail="Open Food Facts is unavailable right now")

    if payload.get("status") != 1 or "product" not in payload:
        raise HTTPException(status_code=404, detail="Product not found for this barcode")

    product = payload["product"]
    result = _normalize_product(product, f"Barcode {barcode}")
    return {
        "barcode": barcode,
        "name": result["name"],
        "brand": result["brand"],
        "image_url": result["image_url"],
        "quantity_label": result["quantity_label"],
        "serving_size": result["serving_size"],
        "nutrition_basis": result["nutrition_basis"],
        "calories": result["calories"],
        "protein": result["protein"],
        "carbs": result["carbs"],
        "fat": result["fat"],
        "fiber": result["fiber"],
        "sugar": result["sugar"],
        "sodium": result["sodium"],
        "vitamin_c": result["vitamin_c"],
        "vitamin_d": result["vitamin_d"],
        "vitamin_b12": result["vitamin_b12"],
        "iron": result["iron"],
        "calcium": result["calcium"],
        "potassium": result["potassium"],
    }


def search_foods(query_text: str, page: int = 1, page_size: int = 12) -> dict:
    query_text = (query_text or "").strip()
    if len(query_text) < 2:
        raise HTTPException(status_code=400, detail="Search query must be at least 2 characters")

    safe_page = max(page, 1)
    safe_page_size = min(max(page_size, 1), 20)
    query = urlencode({
        "search_terms": query_text,
        "search_simple": 1,
        "action": "process",
        "json": 1,
        "page": safe_page,
        "page_size": safe_page_size,
        "fields": f"code,{OPEN_FOOD_FACTS_FIELDS}",
    })
    url = OPEN_FOOD_FACTS_SEARCH_URL + "?" + query
    request = Request(url, headers={"User-Agent": OPEN_FOOD_FACTS_USER_AGENT})

    local_fallback = _local_food_results(query_text, safe_page, safe_page_size)

    try:
        with urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        if local_fallback["results"]:
            return local_fallback
        if exc.code == 503:
            raise HTTPException(status_code=503, detail="Open Food Facts search is busy right now. Try again shortly. You can still enter nutrition manually.")
        raise HTTPException(status_code=exc.code, detail="Food search failed")
    except URLError:
        if local_fallback["results"]:
            return local_fallback
        raise HTTPException(status_code=503, detail="Open Food Facts is unavailable right now. You can still enter nutrition manually.")

    products = payload.get("products") or []
    results = []
    for product in products:
        normalized = _normalize_product(product, "Open Food Facts item")
        if normalized["name"] and normalized["code"]:
            results.append(normalized)

    if not results and local_fallback["results"]:
        return local_fallback

    return {
        "query": query_text,
        "total_results": int(payload.get("count") or 0),
        "page": safe_page,
        "page_size": safe_page_size,
        "results": results,
    }
