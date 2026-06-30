import base64
import json
import os
import re

import google.generativeai as genai
from fastapi import HTTPException

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
DEFAULT_GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest"]
GEMINI_MODEL = os.getenv("GEMINI_VISION_MODEL", os.getenv("GEMINI_MODEL", DEFAULT_GEMINI_MODELS[0]))


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


def _is_quota_error(exc: Exception) -> bool:
    message = str(exc).lower()
    return (
        "429" in message
        or "quota" in message
        or "rate limit" in message
        or "resource_exhausted" in message
    )


def _decode_image(image_base64: str) -> bytes:
    if not image_base64 or not str(image_base64).strip():
        raise HTTPException(status_code=400, detail="Food image is required")

    raw_value = str(image_base64).strip()
    if "," in raw_value:
        raw_value = raw_value.split(",", 1)[1]

    try:
        return base64.b64decode(raw_value, validate=True)
    except Exception:
        raise HTTPException(status_code=400, detail="Food image is not valid base64")


def _clean_json_text(text: str) -> str:
    cleaned = (text or "").strip()
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned)
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    return match.group(0) if match else cleaned


def _to_non_negative_number(data: dict, field: str) -> float:
    try:
        value = float(data[field])
    except (KeyError, TypeError, ValueError):
        raise ValueError(f"Invalid or missing {field}")
    if value < 0:
        raise ValueError(f"{field} cannot be negative")
    return round(value, 1)


def analyze_food_image(image_base64: str) -> dict:
    """Analyze food image using Gemini Vision and return nutrition for the visible portion."""
    try:
        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=503,
                detail="AI food scanner is not configured. Set GEMINI_API_KEY on the backend.",
            )

        image_data = _decode_image(image_base64)

        prompt = """Analyze the image and identify the visible edible food or drink.

Return ONLY one valid JSON object in this exact shape:
{
  "name": "food name here",
  "calories": 0,
  "protein": 0,
  "carbs": 0,
  "fat": 0
}

Rules:
- If no food is clearly visible, use name "Unknown food" and all numeric values 0.
- Estimate the whole visible portion, not a generic serving.
- Include multiple visible items in the name, such as "rice, dal, and salad".
- calories is kcal for the visible portion.
- protein, carbs, and fat are grams for the visible portion.
- Return JSON only. No markdown, no explanation."""

        genai.configure(api_key=GEMINI_API_KEY)
        last_error = None
        for model_name in _get_gemini_model_names(GEMINI_MODEL):
            try:
                model = genai.GenerativeModel(model_name)
                response = model.generate_content([
                    prompt,
                    {
                        "mime_type": "image/jpeg",
                        "data": image_data,
                    },
                ])
                break
            except Exception as exc:
                last_error = exc
                if not (_is_model_unavailable_error(exc) or _is_quota_error(exc)):
                    raise
        else:
            if last_error and _is_quota_error(last_error):
                raise HTTPException(
                    status_code=429,
                    detail="AI food scanner quota is exhausted for now. Try again later or enter nutrition manually.",
                )
            raise HTTPException(status_code=502, detail=f"AI food scanner failed: {last_error}")

        data = json.loads(_clean_json_text(getattr(response, "text", "")))
        required = ["name", "calories", "protein", "carbs", "fat"]
        for field in required:
            if field not in data:
                raise ValueError(f"Missing field: {field}")

        name = str(data["name"]).strip()
        if not name:
            raise ValueError("Food name is empty")

        return {
            "name": name[:120],
            "calories": _to_non_negative_number(data, "calories"),
            "protein": _to_non_negative_number(data, "protein"),
            "carbs": _to_non_negative_number(data, "carbs"),
            "fat": _to_non_negative_number(data, "fat"),
        }
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Could not parse AI food scan response as JSON")
    except HTTPException:
        raise
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"AI food scan returned invalid nutrition data: {exc}")
    except Exception as exc:
        if _is_quota_error(exc):
            raise HTTPException(
                status_code=429,
                detail="AI food scanner quota is exhausted for now. Try again later or enter nutrition manually.",
            )
        raise HTTPException(status_code=502, detail=f"AI food scanner failed: {exc}")
