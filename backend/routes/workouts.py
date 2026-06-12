from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from datetime import date
from database import get_db
from models import Workout, WorkoutSet, User
from schemas import (
    DetailedWorkoutCreate,
    DetailedWorkoutResponse,
    WorkoutCreate,
    WorkoutExerciseResponse,
    WorkoutLibraryResponse,
    WorkoutResponse,
)
from routes.auth import get_current_user
from utils.workout_library import WORKOUT_LIBRARY

router = APIRouter(prefix="/workouts", tags=["workouts"])


def _serialize_detailed_workout(workout: Workout) -> DetailedWorkoutResponse:
    grouped = {}
    for set_log in sorted(workout.sets, key=lambda item: (item.exercise_name, item.set_number)):
        grouped.setdefault(set_log.exercise_name, []).append(set_log)

    exercises = [
        WorkoutExerciseResponse(name=name, sets=sets)
        for name, sets in grouped.items()
    ]

    return DetailedWorkoutResponse(
        id=workout.id,
        date=workout.date,
        workout_type=workout.workout_type,
        duration_minutes=workout.duration_minutes,
        calories_burned=workout.calories_burned,
        notes=workout.notes,
        exercises=exercises,
    )


@router.post("/log", response_model=WorkoutResponse)
def log_workout(
    data: WorkoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        workout = Workout(
            user_id=current_user.id,
            date=data.date,
            workout_type=data.workout_type,
            duration_minutes=data.duration_minutes,
            calories_burned=data.calories_burned,
            notes=data.notes
        )
        db.add(workout)
        db.commit()
        db.refresh(workout)
        return workout
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/logs/{log_date}", response_model=List[WorkoutResponse])
def get_workouts(
    log_date: date,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        workouts = db.query(Workout).filter(
            Workout.user_id == current_user.id,
            Workout.date == log_date
        ).all()
        return workouts
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/log/{workout_id}")
def delete_workout(
    workout_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        workout = db.query(Workout).filter(
            Workout.id == workout_id,
            Workout.user_id == current_user.id
        ).first()
        if not workout:
            raise HTTPException(status_code=404, detail="Workout not found")
        db.delete(workout)
        db.commit()
        return {"message": "Deleted"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/library", response_model=WorkoutLibraryResponse)
def get_workout_library(current_user: User = Depends(get_current_user)):
    _ = current_user
    return {"plans": WORKOUT_LIBRARY}


@router.post("/log-detailed", response_model=DetailedWorkoutResponse)
def log_detailed_workout(
    data: DetailedWorkoutCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        workout = Workout(
            user_id=current_user.id,
            date=data.date,
            workout_type=data.workout_type,
            duration_minutes=data.duration_minutes,
            calories_burned=data.calories_burned,
            notes=data.notes,
        )
        db.add(workout)
        db.flush()

        for exercise in data.exercises:
            for index, set_data in enumerate(exercise.sets, start=1):
                db.add(WorkoutSet(
                    workout_id=workout.id,
                    exercise_name=exercise.name,
                    set_number=index,
                    reps=set_data.reps,
                    weight=set_data.weight,
                ))

        db.commit()
        db.refresh(workout)
        return _serialize_detailed_workout(workout)
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/history", response_model=List[DetailedWorkoutResponse])
def get_workout_history(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    workouts = db.query(Workout).filter(
        Workout.user_id == current_user.id
    ).order_by(Workout.date.desc(), Workout.created_at.desc()).limit(limit).all()
    return [_serialize_detailed_workout(workout) for workout in workouts]


@router.get("/streak")
def get_workout_streak(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Calculate current and best workout streaks.
    A streak is a consecutive day with at least one workout logged.
    """
    try:
        from datetime import timedelta, date as date_obj
        
        today = date_obj.today()
        current_streak = 0
        best_streak = 0
        temp = 0
        
        # Calculate current streak (from today backwards)
        for i in range(90):
            d = today - timedelta(days=i)
            has_workout = db.query(Workout).filter(
                Workout.user_id == current_user.id,
                Workout.date == d
            ).first()
            
            if has_workout:
                current_streak += 1
            else:
                if i == 0:
                    current_streak = 0
                break
        
        # Calculate best streak over 90 days
        for i in range(89, -1, -1):
            d = today - timedelta(days=i)
            has_workout = db.query(Workout).filter(
                Workout.user_id == current_user.id,
                Workout.date == d
            ).first()
            
            if has_workout:
                temp += 1
                best_streak = max(best_streak, temp)
            else:
                temp = 0
        
        return {
            "current_streak": current_streak,
            "best_streak": best_streak
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calendar")
def get_workout_calendar(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get workout calendar data for the past 90 days.
    Returns dict with date strings as keys and workout count as values.
    """
    try:
        from datetime import timedelta, date as date_obj
        
        today = date_obj.today()
        calendar_data = {}
        
        # Get workouts for past 90 days
        for i in range(90):
            d = today - timedelta(days=i)
            workouts = db.query(Workout).filter(
                Workout.user_id == current_user.id,
                Workout.date == d
            ).all()
            
            if workouts:
                calendar_data[d.isoformat()] = len(workouts)
        
        return calendar_data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
