from datetime import timedelta, date
from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from models import FoodLog, User, WaterLog, WeightLog, Workout
from routes.auth import get_current_user
from schemas import AchievementResponse
from utils.achievements import build_achievements


router = APIRouter(prefix="/users", tags=["achievements"])


@router.get("/achievements", response_model=List[AchievementResponse])
def get_achievements(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    start_date = date.today() - timedelta(days=90)

    food_logs = db.query(FoodLog).filter(
        FoodLog.user_id == current_user.id,
        FoodLog.date >= start_date,
    ).all()
    water_logs = db.query(WaterLog).filter(
        WaterLog.user_id == current_user.id,
        WaterLog.date >= start_date,
    ).all()
    weight_logs = db.query(WeightLog).filter(
        WeightLog.user_id == current_user.id,
        WeightLog.date >= start_date,
    ).all()
    workouts = db.query(Workout).filter(
        Workout.user_id == current_user.id,
        Workout.date >= start_date,
    ).all()

    return build_achievements(current_user, food_logs, water_logs, weight_logs, workouts)
