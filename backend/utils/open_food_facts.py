import json
from difflib import SequenceMatcher
from typing import Optional, Tuple
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from fastapi import HTTPException

from utils.indian_foods import INDIAN_FOOD_CATALOG


OPEN_FOOD_FACTS_URL = "https://world.openfoodfacts.org/api/v2/product/{barcode}.json"
OPEN_FOOD_FACTS_SEARCH_URL = "https://world.openfoodfacts.org/cgi/search.pl"
OPEN_FOOD_FACTS_FIELDS = (
    "product_name,product_name_en,generic_name,generic_name_en,lang,brands,"
    "countries_tags,serving_size,quantity,image_front_small_url,nutriments"
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


def _preferred_english_name(product: dict, fallback_name: Optional[str] = None) -> Optional[str]:
    english_name = product.get("product_name_en") or product.get("generic_name_en")
    if english_name:
        return str(english_name).strip()

    language = str(product.get("lang") or "").lower()
    if language in ("", "en"):
        original_name = product.get("product_name") or product.get("generic_name")
        if original_name:
            return str(original_name).strip()

    return fallback_name


def _normalize_product(product: dict, fallback_name: str, english_only: bool = False) -> dict:
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

    if english_only:
        name = _preferred_english_name(product)
    else:
        name = _preferred_english_name(product, fallback_name)

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


def _local_match_score(item: dict, query_text: str) -> int:
    query_lower = query_text.casefold()
    name = item["name"].casefold()
    tags = [tag.casefold() for tag in item["tags"]]

    if query_lower == name:
        return 120
    if query_lower in tags:
        return 110
    if name.startswith(query_lower):
        return 100
    if query_lower in name:
        return 90
    if any(tag.startswith(query_lower) for tag in tags):
        return 80
    if any(query_lower in tag for tag in tags):
        return 70

    query_tokens = [token for token in query_lower.split() if token]
    searchable = " ".join([name, *tags])
    if query_tokens and all(token in searchable for token in query_tokens):
        return 60

    if len(query_lower) >= 4:
        candidates = [name, *tags]
        if any(
            SequenceMatcher(None, query_lower, candidate).ratio() >= 0.84
            for candidate in candidates
        ):
            return 55
    return 0


def _local_food_results(query_text: str, page: int, page_size: int) -> dict:
    ranked_matches = [
        (_local_match_score(item, query_text), index, item)
        for index, item in enumerate(INDIAN_FOOD_CATALOG)
    ]
    matches = [
        item
        for score, _, item in sorted(
            (entry for entry in ranked_matches if entry[0] > 0),
            key=lambda entry: (-entry[0], entry[1]),
        )
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
                "brand": "Deeply Fit Indian estimate",
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
        "lc": "en",
        "cc": "in",
        "tagtype_0": "countries",
        "tag_contains_0": "contains",
        "tag_0": "india",
    })
    url = OPEN_FOOD_FACTS_SEARCH_URL + "?" + query
    request = Request(url, headers={"User-Agent": OPEN_FOOD_FACTS_USER_AGENT})

    local_results = _local_food_results(query_text, safe_page, safe_page_size)
    if local_results["results"]:
        return local_results

    try:
        with urlopen(request, timeout=12) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except HTTPError as exc:
        if local_results["results"]:
            return local_results
        if exc.code == 503:
            raise HTTPException(status_code=503, detail="Open Food Facts search is busy right now. Try again shortly. You can still enter nutrition manually.")
        raise HTTPException(status_code=exc.code, detail="Food search failed")
    except URLError:
        if local_results["results"]:
            return local_results
        raise HTTPException(status_code=503, detail="Open Food Facts is unavailable right now. You can still enter nutrition manually.")

    products = payload.get("products") or []
    results = []
    for product in products:
        normalized = _normalize_product(product, "", english_only=True)
        if normalized["name"] and normalized["code"]:
            results.append(normalized)

    combined_results = []
    seen_keys = set()
    for result in [*local_results["results"], *results]:
        dedupe_key = (result["name"].casefold(), result["brand"] or "")
        if dedupe_key in seen_keys:
            continue
        seen_keys.add(dedupe_key)
        combined_results.append(result)

    if not combined_results and local_results["results"]:
        return local_results

    return {
        "query": query_text,
        "total_results": len(local_results["results"]) + int(payload.get("count") or 0),
        "page": safe_page,
        "page_size": safe_page_size,
        "results": combined_results[:safe_page_size],
    }
