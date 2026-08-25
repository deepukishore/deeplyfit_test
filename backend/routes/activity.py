from datetime import date
from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import StepLog, User
from routes.auth import get_current_user
from schemas import StepLogCreate, StepLogResponse


router = APIRouter(prefix="/activity", tags=["activity"])


@router.post("/steps", response_model=StepLogResponse)
def sync_steps(
    data: StepLogCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        log = db.query(StepLog).filter(
            StepLog.user_id == current_user.id,
            StepLog.date == data.date,
        ).first()

        if log:
            # Sensor callbacks can arrive out of order. Never replace a larger
            # same-day total with an older, smaller reading.
            log.steps = max(log.steps or 0, data.steps)
            log.source = data.source
        else:
            log = StepLog(
                user_id=current_user.id,
                date=data.date,
                steps=data.steps,
                source=data.source,
            )
            db.add(log)

        db.commit()
        db.refresh(log)
        return log
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc))


@router.get("/steps/{log_date}", response_model=StepLogResponse)
def get_steps_for_date(
    log_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    log = db.query(StepLog).filter(
        StepLog.user_id == current_user.id,
        StepLog.date == log_date,
    ).first()
    if log:
        return log
    return StepLogResponse(id=0, date=log_date, steps=0, source="not_connected")


@router.get("/steps", response_model=List[StepLogResponse])
def get_step_history(
    limit: int = 7,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    safe_limit = max(1, min(limit, 90))
    logs = db.query(StepLog).filter(
        StepLog.user_id == current_user.id,
    ).order_by(StepLog.date.desc()).limit(safe_limit).all()
    return list(reversed(logs))
