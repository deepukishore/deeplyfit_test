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

    try:
        with urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        if exc.code == 503:
            raise HTTPException(status_code=503, detail="Open Food Facts search is busy right now. Try again shortly.")
        raise HTTPException(status_code=exc.code, detail="Food search failed")
    except URLError:
        raise HTTPException(status_code=503, detail="Open Food Facts is unavailable right now")

    products = payload.get("products") or []
    results = []
    for product in products:
        normalized = _normalize_product(product, "Open Food Facts item")
        if normalized["name"] and normalized["code"]:
            results.append(normalized)

    return {
        "query": query_text,
        "total_results": int(payload.get("count") or 0),
        "page": safe_page,
        "page_size": safe_page_size,
        "results": results,
    }
