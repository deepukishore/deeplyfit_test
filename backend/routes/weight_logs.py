from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from database import get_db
from models import WeightLog, User
from schemas import BMIHistoryResponse, BMIPoint, WeightLogCreate, WeightLogResponse
from routes.auth import get_current_user

router = APIRouter(prefix="/weight", tags=["weight"])


@router.post("/log", response_model=WeightLogResponse)
def log_weight(
    data: WeightLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        existing = db.query(WeightLog).filter(
            WeightLog.user_id == current_user.id,
            WeightLog.date == data.date
        ).first()
        if existing:
            existing.weight = data.weight
            existing.notes = data.notes
            db.commit()
            db.refresh(existing)
            return existing
        log = WeightLog(
            user_id=current_user.id,
            date=data.date,
            weight=data.weight,
            notes=data.notes
        )
        db.add(log)
        db.commit()
        db.refresh(log)

        current_user.current_weight = data.weight
        db.commit()

        return log
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs", response_model=List[WeightLogResponse])
def get_weight_logs(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        logs = db.query(WeightLog).filter(
            WeightLog.user_id == current_user.id
        ).order_by(WeightLog.date.desc()).limit(limit).all()
        return list(reversed(logs))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/bmi-history", response_model=BMIHistoryResponse)
def get_bmi_history(
    limit: int = 30,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if not current_user.height:
        raise HTTPException(status_code=400, detail="Height is required to calculate BMI")

    height_m = current_user.height / 100
    logs = db.query(WeightLog).filter(
        WeightLog.user_id == current_user.id
    ).order_by(WeightLog.date.desc()).limit(limit).all()
    logs = list(reversed(logs))

    history = [
        BMIPoint(
            date=log.date,
            weight=log.weight,
            bmi=round(log.weight / (height_m * height_m), 1),
        )
        for log in logs
    ]

    latest_bmi = history[-1].bmi if history else None
    if latest_bmi is None:
        category = None
    elif latest_bmi < 18.5:
        category = "Underweight"
    elif latest_bmi < 25:
        category = "Healthy"
    elif latest_bmi < 30:
        category = "Overweight"
    else:
        category = "Obesity"

    return BMIHistoryResponse(
        height_cm=current_user.height,
        latest_bmi=latest_bmi,
        bmi_category=category,
        healthy_bmi_min=18.5,
        healthy_bmi_max=24.9,
        healthy_weight_min=round(18.5 * height_m * height_m, 1),
        healthy_weight_max=round(24.9 * height_m * height_m, 1),
        history=history,
    )
