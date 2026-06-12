from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from database import get_db
from models import FoodLog, User
from schemas import (
    FoodLogCreate,
    FoodLogResponse,
    DailySummary,
    BarcodeLogCreate,
    BarcodeLookupResponse,
    CopyMealsRequest,
    FoodSearchResponse,
    MealSuggestionsResponse,
    AllergenCheckResponse,
)
from routes.auth import get_current_user
from models import Workout, WaterLog
from utils.open_food_facts import fetch_barcode_nutrition, search_foods
from utils.allergens import detect_allergens_in_food, deserialize_allergens
from ai.meal_suggestions import build_meal_suggestions

router = APIRouter(prefix="/food", tags=["food"])

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


def _micronutrient_summary(food_logs):
    totals = {
        "fiber": round(sum(f.fiber for f in food_logs), 1),
        "sugar": round(sum(f.sugar for f in food_logs), 1),
        "sodium": round(sum(f.sodium for f in food_logs), 1),
        "vitamin_c": round(sum(f.vitamin_c for f in food_logs), 1),
        "vitamin_d": round(sum(f.vitamin_d for f in food_logs), 1),
        "vitamin_b12": round(sum(f.vitamin_b12 for f in food_logs), 1),
        "iron": round(sum(f.iron for f in food_logs), 1),
        "calcium": round(sum(f.calcium for f in food_logs), 1),
        "potassium": round(sum(f.potassium for f in food_logs), 1),
    }
    totals["percent_of_rda"] = {
        key: round((totals[key] / target) * 100, 1) if target else 0
        for key, target in MICRONUTRIENT_RDA.items()
    }
    return totals


def _get_summary_data(db: Session, current_user: User, summary_date: date):
    food_logs = db.query(FoodLog).filter(
        FoodLog.user_id == current_user.id,
        FoodLog.date == summary_date
    ).all()

    workouts = db.query(Workout).filter(
        Workout.user_id == current_user.id,
        Workout.date == summary_date
    ).all()

    water_log = db.query(WaterLog).filter(
        WaterLog.user_id == current_user.id,
        WaterLog.date == summary_date
    ).first()

    calories_consumed = sum(f.calories for f in food_logs)
    calories_burned = sum(w.calories_burned for w in workouts)
    protein = sum(f.protein for f in food_logs)
    carbs = sum(f.carbs for f in food_logs)
    fat = sum(f.fat for f in food_logs)

    return {
        "food_logs": food_logs,
        "workouts": workouts,
        "water_log": water_log,
        "calories_consumed": round(calories_consumed, 1),
        "calories_burned": round(calories_burned, 1),
        "protein": round(protein, 1),
        "carbs": round(carbs, 1),
        "fat": round(fat, 1),
        "micronutrients": _micronutrient_summary(food_logs),
    }


@router.post("/log", response_model=FoodLogResponse)
def log_food(
    data: FoodLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        log = FoodLog(
            user_id=current_user.id,
            date=data.date,
            meal_type=data.meal_type,
            food_name=data.food_name,
            calories=data.calories * data.quantity,
            protein=data.protein * data.quantity,
            carbs=data.carbs * data.quantity,
            fat=data.fat * data.quantity,
            fiber=data.fiber * data.quantity,
            sugar=data.sugar * data.quantity,
            sodium=data.sodium * data.quantity,
            vitamin_c=data.vitamin_c * data.quantity,
            vitamin_d=data.vitamin_d * data.quantity,
            vitamin_b12=data.vitamin_b12 * data.quantity,
            iron=data.iron * data.quantity,
            calcium=data.calcium * data.quantity,
            potassium=data.potassium * data.quantity,
            quantity=data.quantity
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs/{log_date}", response_model=List[FoodLogResponse])
def get_food_logs(
    log_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        logs = db.query(FoodLog).filter(
            FoodLog.user_id == current_user.id,
            FoodLog.date == log_date
        ).all()
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/log/{log_id}")
def delete_food_log(
    log_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        log = db.query(FoodLog).filter(
            FoodLog.id == log_id,
            FoodLog.user_id == current_user.id
        ).first()
        if not log:
            raise HTTPException(status_code=404, detail="Log not found")
        db.delete(log)
        db.commit()
        return {"message": "Deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary/{summary_date}", response_model=DailySummary)
def get_daily_summary(
    summary_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        summary = _get_summary_data(db, current_user, summary_date)

        return DailySummary(
            date=summary_date,
            calories_consumed=summary["calories_consumed"],
            calories_burned=summary["calories_burned"],
            calories_target=current_user.calorie_target or 2000,
            protein=summary["protein"],
            carbs=summary["carbs"],
            fat=summary["fat"],
            water_glasses=summary["water_log"].glasses if summary["water_log"] else 0,
            micronutrients=summary["micronutrients"],
            food_logs=summary["food_logs"],
            workouts=summary["workouts"]
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/weekly-summary")
def get_weekly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        from datetime import timedelta
        today = date.today()
        week_data = []

        for i in range(6, -1, -1):
            d = today - timedelta(days=i)
            food_logs = db.query(FoodLog).filter(
                FoodLog.user_id == current_user.id,
                FoodLog.date == d
            ).all()
            calories = sum(f.calories for f in food_logs)
            week_data.append({
                "date": d.strftime("%a"),
                "calories": round(calories, 0),
                "target": current_user.calorie_target or 2000
            })

        return week_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/barcode/{barcode}", response_model=BarcodeLookupResponse)
def lookup_barcode(barcode: str, current_user: User = Depends(get_current_user)):
    _ = current_user
    return fetch_barcode_nutrition(barcode)


@router.get("/search", response_model=FoodSearchResponse)
def search_food_database(
    q: str,
    page: int = 1,
    page_size: int = 12,
    current_user: User = Depends(get_current_user)
):
    _ = current_user
    return search_foods(q, page=page, page_size=page_size)


@router.post("/barcode/log", response_model=FoodLogResponse)
def log_food_from_barcode(
    data: BarcodeLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    nutrition = fetch_barcode_nutrition(data.barcode)
    quantity = max(data.quantity or 1, 0.1)

    try:
        log = FoodLog(
            user_id=current_user.id,
            date=data.date,
            meal_type=data.meal_type,
            food_name=nutrition["name"],
            calories=nutrition["calories"] * quantity,
            protein=nutrition["protein"] * quantity,
            carbs=nutrition["carbs"] * quantity,
            fat=nutrition["fat"] * quantity,
            fiber=nutrition["fiber"] * quantity,
            sugar=nutrition["sugar"] * quantity,
            sodium=nutrition["sodium"] * quantity,
            vitamin_c=nutrition["vitamin_c"] * quantity,
            vitamin_d=nutrition["vitamin_d"] * quantity,
            vitamin_b12=nutrition["vitamin_b12"] * quantity,
            iron=nutrition["iron"] * quantity,
            calcium=nutrition["calcium"] * quantity,
            potassium=nutrition["potassium"] * quantity,
            quantity=quantity,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/copy-day")
def copy_food_logs_from_day(
    data: CopyMealsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    source_logs_query = db.query(FoodLog).filter(
        FoodLog.user_id == current_user.id,
        FoodLog.date == data.source_date
    )

    if data.meal_type:
        source_logs_query = source_logs_query.filter(FoodLog.meal_type == data.meal_type)

    source_logs = source_logs_query.all()
    if not source_logs:
        raise HTTPException(status_code=404, detail="No meals found on that day")

    try:
        copied = 0
        for source_log in source_logs:
            db.add(FoodLog(
                user_id=current_user.id,
                date=data.target_date,
                meal_type=source_log.meal_type,
                food_name=source_log.food_name,
                calories=source_log.calories,
                protein=source_log.protein,
                carbs=source_log.carbs,
                fat=source_log.fat,
                fiber=source_log.fiber,
                sugar=source_log.sugar,
                sodium=source_log.sodium,
                vitamin_c=source_log.vitamin_c,
                vitamin_d=source_log.vitamin_d,
                vitamin_b12=source_log.vitamin_b12,
                iron=source_log.iron,
                calcium=source_log.calcium,
                potassium=source_log.potassium,
                quantity=source_log.quantity,
            ))
            copied += 1

        db.commit()
        return {"message": "Meals copied", "count": copied}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/suggestions/{suggestion_date}", response_model=MealSuggestionsResponse)
def get_meal_suggestions(
    suggestion_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    summary = _get_summary_data(db, current_user, suggestion_date)
    return build_meal_suggestions(current_user, summary)


@router.get("/calorie-streak")
def get_calorie_streak(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    from datetime import timedelta
    target = current_user.calorie_target or 2000
    today = date.today()
    current_streak = 0
    best_streak = 0
    temp = 0

    # Check up to 90 days back
    for i in range(90):
        d = today - timedelta(days=i)
        logs = db.query(FoodLog).filter(
            FoodLog.user_id == current_user.id,
            FoodLog.date == d
        ).all()
        if not logs:
            if i == 0:
                continue  # today not logged yet, skip
            break
        consumed = sum(f.calories for f in logs)
        if consumed <= target:
            if i == 0 or current_streak > 0:
                current_streak += 1
        else:
            break

    # Calculate best streak over 90 days
    for i in range(89, -1, -1):
        d = today - timedelta(days=i)
        logs = db.query(FoodLog).filter(
            FoodLog.user_id == current_user.id,
            FoodLog.date == d
        ).all()
        if logs and sum(f.calories for f in logs) <= target:
            temp += 1
            best_streak = max(best_streak, temp)
        else:
            temp = 0

    return {"current_streak": current_streak, "best_streak": best_streak}


@router.post("/check-allergens", response_model=AllergenCheckResponse)
def check_allergens(
    food_name: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        user_allergens = deserialize_allergens(current_user.allergens_json)
        detected = detect_allergens_in_food(food_name, user_allergens)
        
        return AllergenCheckResponse(
            food_name=food_name,
            detected_allergens=detected or [],
            has_allergens=bool(detected)
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
