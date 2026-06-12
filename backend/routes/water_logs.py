from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from database import get_db
from models import WaterLog, User
from schemas import WaterLogCreate, WaterLogResponse
from routes.auth import get_current_user

router = APIRouter(prefix="/water", tags=["water"])


@router.get("/goal")
def get_water_goal(current_user: User = Depends(get_current_user)):
    return {"water_goal": current_user.water_goal or 8}


@router.post("/goal")
def set_water_goal(
    data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    goal = max(1, min(int(data.get("water_goal", 8)), 30))
    current_user.water_goal = goal
    db.commit()
    return {"water_goal": goal}

@router.post("/log", response_model=WaterLogResponse)
def log_water(
    data: WaterLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        existing = db.query(WaterLog).filter(
            WaterLog.user_id == current_user.id,
            WaterLog.date == data.date
        ).first()
        if existing:
            existing.glasses = data.glasses
            db.commit()
            db.refresh(existing)
            return existing
        log = WaterLog(user_id=current_user.id, date=data.date, glasses=data.glasses)
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/log/{log_date}", response_model=WaterLogResponse)
def get_water_log(
    log_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        log = db.query(WaterLog).filter(
            WaterLog.user_id == current_user.id,
            WaterLog.date == log_date
        ).first()
        if not log:
            return WaterLogResponse(id=0, date=log_date, glasses=0)
        return log
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/add-glass")
def add_glass(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        today = date.today()
        log = db.query(WaterLog).filter(
            WaterLog.user_id == current_user.id,
            WaterLog.date == today
        ).first()
        if log:
            log.glasses += 1
            db.commit()
            db.refresh(log)
            return log
        log = WaterLog(user_id=current_user.id, date=today, glasses=1)
        db.add(log)
        db.commit()
        db.refresh(log)
        return log
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
