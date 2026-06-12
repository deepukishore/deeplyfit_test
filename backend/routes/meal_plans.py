import json
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import MealPlanEntry, MealTemplate, User
from routes.auth import get_current_user
from schemas import MealPlanEntryCreate, MealPlanEntryResponse, WeeklyMealPlanResponse
from utils.nutrition import summarize_recipe_items


router = APIRouter(prefix="/meal-plans", tags=["meal-plans"])


def _template_foods(template: MealTemplate):
    return json.loads(template.foods_json or "[]")


def _entry_response(entry: MealPlanEntry) -> MealPlanEntryResponse:
    foods = _template_foods(entry.template)
    nutrition = summarize_recipe_items(foods, multiplier=entry.servings or 1)
    return MealPlanEntryResponse(
        id=entry.id,
        planned_date=entry.planned_date,
        meal_type=entry.meal_type,
        servings=entry.servings,
        notes=entry.notes,
        template_id=entry.template_id,
        template_name=entry.template.name,
        template_type=entry.template.template_type or "meal",
        nutrition=nutrition,
    )


@router.get("/week", response_model=WeeklyMealPlanResponse)
def get_weekly_meal_plan(
    start_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    end_date = start_date + timedelta(days=6)
    entries = db.query(MealPlanEntry).join(MealTemplate).filter(
        MealPlanEntry.user_id == current_user.id,
        MealPlanEntry.planned_date >= start_date,
        MealPlanEntry.planned_date <= end_date,
    ).order_by(MealPlanEntry.planned_date.asc(), MealPlanEntry.created_at.asc()).all()

    entry_responses = [_entry_response(entry) for entry in entries]
    totals = summarize_recipe_items([
        {
            "calories": response.nutrition.calories,
            "protein": response.nutrition.protein,
            "carbs": response.nutrition.carbs,
            "fat": response.nutrition.fat,
            "fiber": response.nutrition.micronutrients.fiber,
            "sugar": response.nutrition.micronutrients.sugar,
            "sodium": response.nutrition.micronutrients.sodium,
            "vitamin_c": response.nutrition.micronutrients.vitamin_c,
            "vitamin_d": response.nutrition.micronutrients.vitamin_d,
            "vitamin_b12": response.nutrition.micronutrients.vitamin_b12,
            "iron": response.nutrition.micronutrients.iron,
            "calcium": response.nutrition.micronutrients.calcium,
            "potassium": response.nutrition.micronutrients.potassium,
        }
        for response in entry_responses
    ])

    shopping_map = {}
    for entry in entries:
        foods = _template_foods(entry.template)
        for food in foods:
            key = food["food_name"].strip().lower()
            shopping_map.setdefault(key, {
                "food_name": food["food_name"],
                "quantity": 0.0,
                "unit_hint": food.get("serving_size") or "servings",
            })
            shopping_map[key]["quantity"] += float(food.get("quantity", 1) or 1) * float(entry.servings or 1)

    shopping_list = [
        {
            "food_name": item["food_name"],
            "quantity": round(item["quantity"], 1),
            "unit_hint": item["unit_hint"],
        }
        for item in sorted(shopping_map.values(), key=lambda value: value["food_name"].lower())
    ]

    return WeeklyMealPlanResponse(
        start_date=start_date,
        end_date=end_date,
        entries=entry_responses,
        totals=totals,
        shopping_list=shopping_list,
    )


@router.post("/entries", response_model=MealPlanEntryResponse)
def create_meal_plan_entry(
    data: MealPlanEntryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = db.query(MealTemplate).filter(
        MealTemplate.id == data.template_id,
        MealTemplate.user_id == current_user.id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    try:
        entry = MealPlanEntry(
            user_id=current_user.id,
            template_id=template.id,
            planned_date=data.planned_date,
            meal_type=data.meal_type,
            servings=max(data.servings or 1, 0.1),
            notes=data.notes,
        )
        db.add(entry)
        db.commit()
        db.refresh(entry)
        entry.template = template
        return _entry_response(entry)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/entries/{entry_id}")
def delete_meal_plan_entry(
    entry_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    entry = db.query(MealPlanEntry).filter(
        MealPlanEntry.id == entry_id,
        MealPlanEntry.user_id == current_user.id,
    ).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Meal plan entry not found")

    try:
        db.delete(entry)
        db.commit()
        return {"message": "Deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
