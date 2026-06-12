"""
Allergen detection and management utilities.
"""
import json
from typing import List, Dict, Optional

COMMON_ALLERGENS = [
    "gluten",
    "lactose",
    "nuts",
    "peanuts",
    "eggs",
    "soy",
    "shellfish",
    "fish",
    "sesame",
    "mustard",
]

# Common food-allergen mappings
FOOD_ALLERGEN_MAP = {
    # Gluten-containing
    "bread": ["gluten"],
    "pasta": ["gluten"],
    "cereal": ["gluten"],
    "flour": ["gluten"],
    "wheat": ["gluten"],
    "barley": ["gluten"],
    "rye": ["gluten"],
    "oat": ["gluten"],
    "bagel": ["gluten"],
    "donut": ["gluten"],
    "pancake": ["gluten"],
    "waffle": ["gluten"],
    
    # Lactose-containing
    "milk": ["lactose"],
    "cheese": ["lactose"],
    "yogurt": ["lactose"],
    "butter": ["lactose"],
    "cream": ["lactose"],
    "ice cream": ["lactose"],
    "whipped cream": ["lactose"],
    
    # Nuts
    "peanut": ["peanuts", "nuts"],
    "almond": ["nuts"],
    "cashew": ["nuts"],
    "walnut": ["nuts"],
    "pecan": ["nuts"],
    "pistachio": ["nuts"],
    "hazelnut": ["nuts"],
    "macadamia": ["nuts"],
    "peanut butter": ["peanuts", "nuts"],
    
    # Eggs
    "egg": ["eggs"],
    "mayonnaise": ["eggs"],
    "omelet": ["eggs"],
    "scrambled eggs": ["eggs"],
    
    # Soy
    "soy": ["soy"],
    "tofu": ["soy"],
    "edamame": ["soy"],
    "soy sauce": ["soy"],
    "tempeh": ["soy"],
    
    # Shellfish
    "shrimp": ["shellfish"],
    "crab": ["shellfish"],
    "lobster": ["shellfish"],
    "oyster": ["shellfish"],
    "clam": ["shellfish"],
    "scallop": ["shellfish"],
    
    # Fish
    "salmon": ["fish"],
    "tuna": ["fish"],
    "cod": ["fish"],
    "bass": ["fish"],
    "tilapia": ["fish"],
    "anchovy": ["fish"],
    
    # Sesame
    "sesame": ["sesame"],
    "tahini": ["sesame"],
    
    # Mustard
    "mustard": ["mustard"],
}

def detect_allergens_in_food(food_name: str, user_allergens: List[str]) -> Optional[List[str]]:
    """
    Detect if a food contains any of the user's allergens.
    Returns list of detected allergens, or None if none found.
    """
    if not user_allergens:
        return None
    
    food_lower = food_name.lower()
    detected = set()
    
    # Check food-allergen mapping
    for food_keyword, allergens in FOOD_ALLERGEN_MAP.items():
        if food_keyword in food_lower:
            for allergen in allergens:
                if allergen in [a.lower() for a in user_allergens]:
                    detected.add(allergen)
    
    # Direct allergen name matching
    for allergen in user_allergens:
        if allergen.lower() in food_lower:
            detected.add(allergen)
    
    return list(detected) if detected else None


def serialize_allergens(allergens: List[str]) -> str:
    """Convert allergen list to JSON string."""
    return json.dumps(allergens) if allergens else json.dumps([])


def deserialize_allergens(allergens_json: Optional[str]) -> List[str]:
    """Convert allergen JSON string to list."""
    if not allergens_json:
        return []
    try:
        return json.loads(allergens_json)
    except (json.JSONDecodeError, TypeError):
        return []
