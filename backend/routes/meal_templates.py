import json
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import FoodLog, MealTemplate, User
from routes.auth import get_current_user
from schemas import FoodLogResponse, MealTemplateCreate, MealTemplateLogRequest, MealTemplateResponse


router = APIRouter(prefix="/templates/meals", tags=["meal-templates"])


def _serialize_template(template: MealTemplate) -> MealTemplateResponse:
    return MealTemplateResponse(
        id=template.id,
        name=template.name,
        meal_type=template.meal_type,
        foods=json.loads(template.foods_json),
        template_type=template.template_type or "meal",
        servings=template.servings or 1,
    )


@router.get("", response_model=List[MealTemplateResponse])
def get_meal_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    templates = db.query(MealTemplate).filter(
        MealTemplate.user_id == current_user.id
    ).order_by(MealTemplate.created_at.desc()).all()
    return [_serialize_template(template) for template in templates]


@router.post("", response_model=MealTemplateResponse)
def create_meal_template(
    data: MealTemplateCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        template = MealTemplate(
            user_id=current_user.id,
            name=data.name,
            meal_type=data.meal_type,
            foods_json=json.dumps([food.model_dump() for food in data.foods]),
            template_type=data.template_type,
            servings=data.servings,
        )
        db.add(template)
        db.commit()
        db.refresh(template)
        return _serialize_template(template)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{template_id}/log", response_model=List[FoodLogResponse])
def log_from_meal_template(
    template_id: int,
    data: MealTemplateLogRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = db.query(MealTemplate).filter(
        MealTemplate.id == template_id,
        MealTemplate.user_id == current_user.id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    foods = json.loads(template.foods_json)
    created_logs = []

    try:
        for food in foods:
            quantity = float(food.get("quantity", 1) or 1) * max(data.servings_multiplier or 1, 0.1)
            log = FoodLog(
                user_id=current_user.id,
                date=data.date,
                meal_type=data.meal_type or template.meal_type,
                food_name=food["food_name"],
                calories=float(food.get("calories", 0)) * quantity,
                protein=float(food.get("protein", 0)) * quantity,
                carbs=float(food.get("carbs", 0)) * quantity,
                fat=float(food.get("fat", 0)) * quantity,
                fiber=float(food.get("fiber", 0)) * quantity,
                sugar=float(food.get("sugar", 0)) * quantity,
                sodium=float(food.get("sodium", 0)) * quantity,
                vitamin_c=float(food.get("vitamin_c", 0)) * quantity,
                vitamin_d=float(food.get("vitamin_d", 0)) * quantity,
                vitamin_b12=float(food.get("vitamin_b12", 0)) * quantity,
                iron=float(food.get("iron", 0)) * quantity,
                calcium=float(food.get("calcium", 0)) * quantity,
                potassium=float(food.get("potassium", 0)) * quantity,
                quantity=quantity,
            )
            db.add(log)
            created_logs.append(log)

        db.commit()
        for log in created_logs:
            db.refresh(log)
        return created_logs
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{template_id}")
def delete_meal_template(
    template_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    template = db.query(MealTemplate).filter(
        MealTemplate.id == template_id,
        MealTemplate.user_id == current_user.id,
    ).first()
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")

    try:
        db.delete(template)
        db.commit()
        return {"message": "Deleted"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
