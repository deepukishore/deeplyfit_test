import google.generativeai as genai
import json
import re
import os
import base64
from fastapi import HTTPException

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")


def analyze_food_image(image_base64: str) -> dict:
    """Analyze food image using Gemini Vision and return nutritional data."""
    try:
        if not GEMINI_API_KEY:
            # Return mock data if no API key configured
            return {
                "name": "Mixed Food Item",
                "calories": 350,
                "protein": 15,
                "carbs": 45,
                "fat": 12
            }

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-pro")

        # Decode base64 image
        if "," in image_base64:
            image_base64 = image_base64.split(",")[1]

        image_data = base64.b64decode(image_base64)

        prompt = """Analyze this food image and provide nutritional information.
        
        You MUST respond with ONLY a valid JSON object in this EXACT format, no other text:
        {
            "name": "food name here",
            "calories": 0,
            "protein": 0,
            "carbs": 0,
            "fat": 0
        }
        
        Rules:
        - name: descriptive name of the food
        - calories: total calories as integer
        - protein: grams of protein as number
        - carbs: grams of carbohydrates as number  
        - fat: grams of fat as number
        - Estimate for a typical single serving
        - Return ONLY the JSON, no markdown, no explanation"""

        response = model.generate_content([
            prompt,
            {
                "mime_type": "image/jpeg",
                "data": image_data
            }
        ])

        text = response.text.strip()

        # Extract JSON from response
        json_match = re.search(r'\{[^{}]+\}', text, re.DOTALL)
        if json_match:
            text = json_match.group()

        data = json.loads(text)

        # Validate required fields
        required = ["name", "calories", "protein", "carbs", "fat"]
        for field in required:
            if field not in data:
                raise ValueError(f"Missing field: {field}")

        return {
            "name": str(data["name"]),
            "calories": float(data["calories"]),
            "protein": float(data["protein"]),
            "carbs": float(data["carbs"]),
            "fat": float(data["fat"])
        }

    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Could not parse AI response as JSON")
    except Exception as e:
        # Fallback to mock data on any error
        return {
            "name": "Scanned Food Item",
            "calories": 300,
            "protein": 12,
            "carbs": 40,
            "fat": 10
        }
