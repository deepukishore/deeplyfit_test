import os
from datetime import date, timedelta
from typing import List, Optional

import google.generativeai as genai
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import FoodLog, User, WaterLog, WeightLog, Workout
from routes.auth import get_current_user
from utils.premium import enforce_free_limit

router = APIRouter(prefix="/ai", tags=["ai"])

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    response: str


def get_daily_metrics(user: User, db: Session) -> dict:
    today = date.today()

    food_logs_today = db.query(FoodLog).filter(
        FoodLog.user_id == user.id,
        FoodLog.date == today,
    ).all()

    workouts_today = db.query(Workout).filter(
        Workout.user_id == user.id,
        Workout.date == today,
    ).all()

    water_logs_today = db.query(WaterLog).filter(
        WaterLog.user_id == user.id,
        WaterLog.date == today,
    ).all()

    calories_consumed = sum(f.calories or 0 for f in food_logs_today)
    protein_consumed = sum(f.protein or 0 for f in food_logs_today)
    carbs_consumed = sum(f.carbs or 0 for f in food_logs_today)
    fat_consumed = sum(f.fat or 0 for f in food_logs_today)
    calories_burned = sum(w.calories_burned or 0 for w in workouts_today)

    calorie_target = float(user.calorie_target or 0)
    protein_target = float(user.protein_target or 0)
    carbs_target = float(user.carbs_target or 0)
    fat_target = float(user.fat_target or 0)

    return {
        "today": today,
        "food_logs_today": food_logs_today,
        "workouts_today": workouts_today,
        "water_logs_today": water_logs_today,
        "calories_consumed": calories_consumed,
        "protein_consumed": protein_consumed,
        "carbs_consumed": carbs_consumed,
        "fat_consumed": fat_consumed,
        "calories_burned": calories_burned,
        "calories_remaining": max(calorie_target - calories_consumed + calories_burned, 0),
        "protein_remaining": max(protein_target - protein_consumed, 0),
        "carbs_remaining": max(carbs_target - carbs_consumed, 0),
        "fat_remaining": max(fat_target - fat_consumed, 0),
        "water_glasses": sum(w.glasses or 0 for w in water_logs_today),
        "calorie_target": calorie_target,
        "protein_target": protein_target,
        "carbs_target": carbs_target,
        "fat_target": fat_target,
    }


def get_user_context(user: User, db: Session) -> str:
    metrics = get_daily_metrics(user, db)
    today = metrics["today"]

    profile = f"""=== USER PROFILE ===
Name: {user.name or 'Unknown'}
Age: {user.age or 'Not specified'} years
Gender: {user.gender or 'Not specified'}
Height: {user.height or 'Not specified'} cm
Current Weight: {user.current_weight or 'Not logged'} kg
Goal Weight: {user.goal_weight or 'Not set'} kg
Activity Level: {user.activity_level or 'Not specified'}
Fitness Goal: {user.fitness_goal or 'General fitness'}
BMR: {user.bmr or 'Not calculated'} kcal/day
TDEE: {user.tdee or 'Not calculated'} kcal/day
Daily Calorie Target: {user.calorie_target or 'Not set'} kcal
Daily Protein Target: {user.protein_target or 'Not set'} g
Daily Carbs Target: {user.carbs_target or 'Not set'} g
Daily Fat Target: {user.fat_target or 'Not set'} g
"""

    today_stats = f"""=== TODAY'S STATS ({today.strftime('%Y-%m-%d')}) ===
Calories Consumed: {metrics['calories_consumed']} kcal
Calories Burned: {metrics['calories_burned']} kcal
Calories Remaining: {metrics['calories_remaining']} kcal
Protein Consumed: {metrics['protein_consumed']}g / {user.protein_target or 'N/A'}g target
Carbs Consumed: {metrics['carbs_consumed']}g / {user.carbs_target or 'N/A'}g target
Fat Consumed: {metrics['fat_consumed']}g / {user.fat_target or 'N/A'}g target
Water Intake: {metrics['water_glasses']} glasses
Workouts Completed: {len(metrics['workouts_today'])}
"""

    foods_list = "=== FOODS LOGGED TODAY ===\n"
    if metrics["food_logs_today"]:
        for food in metrics["food_logs_today"]:
            meal_type = food.meal_type or "Meal"
            foods_list += f"- {food.food_name} ({meal_type}): {food.calories} kcal\n"
    else:
        foods_list += "Nothing logged yet\n"

    weight_logs = db.query(WeightLog).filter(
        WeightLog.user_id == user.id,
    ).order_by(WeightLog.date.desc()).limit(7).all()

    weight_trend = "=== WEIGHT TREND (Last 7 Entries) ===\n"
    if weight_logs:
        for log in reversed(weight_logs):
            weight_trend += f"- {log.date.strftime('%Y-%m-%d')}: {log.weight} kg\n"
    else:
        weight_trend += "No weight logs yet\n"

    seven_days_ago = today - timedelta(days=7)
    weekly_logs = db.query(FoodLog).filter(
        FoodLog.user_id == user.id,
        FoodLog.date >= seven_days_ago,
        FoodLog.date <= today,
    ).all()

    if weekly_logs:
        dates = {log.date for log in weekly_logs}
        total_calories = sum(log.calories or 0 for log in weekly_logs)
        avg_daily_calories = total_calories / len(dates) if dates else 0
        weekly_avg = f"=== WEEKLY AVERAGE ===\nAverage Daily Calories: {avg_daily_calories:.0f} kcal\n"
    else:
        weekly_avg = "=== WEEKLY AVERAGE ===\nNo data available yet\n"

    instructions = """=== AI COACH INSTRUCTIONS ===
You are a personal AI fitness and nutrition coach inside the Deeply Fit app.
App tagline: "Intelligently deep. Deeply fit."

STRICT RULES:
- Answer only with generated coaching, not canned templates.
- Always reference the user's actual numbers provided above when relevant.
- Never make up logs, goals, or measurements that are not provided.
- Be warm, motivating, concise, and conversational.
- Keep responses to 2-4 sentences unless the user asks for detail.
- When asked what to eat, suggest specific foods based on remaining macros for the day.
- When asked about logging, remind them to use the Diary tab for accurate tracking.
- When asked for workouts, base suggestions on fitness_goal and activity_level.
- If data is missing or zero, acknowledge it honestly.
- End with a clear next step.
"""

    return profile + today_stats + foods_list + weight_trend + weekly_avg + instructions


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")

    try:
        enforce_free_limit(current_user, "ai_message")

        if not GEMINI_API_KEY:
            raise HTTPException(
                status_code=503,
                detail="AI coach is not configured. Set GEMINI_API_KEY on the backend.",
            )

        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel(GEMINI_MODEL)

        history_text = "=== CONVERSATION HISTORY ===\n"
        if request.history:
            for msg in request.history[-10:]:
                role_label = "User" if msg.role == "user" else "Assistant"
                history_text += f"{role_label}: {msg.content}\n"

        full_prompt = f"""{get_user_context(current_user, db)}

{history_text}

=== CURRENT MESSAGE ===
User: {request.message}

Respond as the AI coach using the data above. Be specific, warm, and actionable."""

        response = model.generate_content(full_prompt)
        response_text = (getattr(response, "text", "") or "").strip()
        if not response_text:
            raise HTTPException(status_code=502, detail="AI coach returned an empty response")

        db.commit()
        return ChatResponse(response=response_text)
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail=f"AI coach failed: {exc}")
