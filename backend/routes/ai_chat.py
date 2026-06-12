from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, timedelta
from database import get_db
from models import User, FoodLog, Workout, WaterLog, WeightLog
from routes.auth import get_current_user
from utils.premium import enforce_free_limit
import google.generativeai as genai
import os

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
        FoodLog.date == today
    ).all()

    workouts_today = db.query(Workout).filter(
        Workout.user_id == user.id,
        Workout.date == today
    ).all()

    water_logs_today = db.query(WaterLog).filter(
        WaterLog.user_id == user.id,
        WaterLog.date == today
    ).all()

    calories_consumed = sum(f.calories for f in food_logs_today) if food_logs_today else 0
    protein_consumed = sum(f.protein for f in food_logs_today) if food_logs_today else 0
    carbs_consumed = sum(f.carbs for f in food_logs_today) if food_logs_today else 0
    fat_consumed = sum(f.fat for f in food_logs_today) if food_logs_today else 0
    calories_burned = sum(w.calories_burned for w in workouts_today) if workouts_today else 0

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
        "water_glasses": len(water_logs_today) if water_logs_today else 0,
        "calorie_target": calorie_target,
        "protein_target": protein_target,
        "carbs_target": carbs_target,
        "fat_target": fat_target,
    }


def build_fallback_response(user: User, metrics: dict, message: str) -> str:
    lowered = message.lower()
    goal = (user.fitness_goal or "general_fitness").lower()
    activity = (user.activity_level or "").replace("_", " ")
    calorie_target = metrics["calorie_target"]
    calories_remaining = metrics["calories_remaining"]
    protein_remaining = metrics["protein_remaining"]

    if any(keyword in lowered for keyword in ["eat", "food", "lunch", "dinner", "breakfast", "meal", "snack"]):
        if calorie_target > 0:
            if calories_remaining > 0:
                return (
                    f"You’ve got about {calories_remaining:.0f} kcal left today, plus "
                    f"{protein_remaining:.0f}g protein remaining. A good next meal is a lean protein "
                    f"with carbs and vegetables — for example chicken or paneer with rice/roti and a salad."
                )
            return (
                "You’re already at or near your calorie target today, so keep the next meal light: "
                "prioritize protein, vegetables, and plenty of water."
            )
        return (
            "I can help with meal ideas, but your calorie target isn’t set yet. "
            "Once onboarding is complete, I’ll be able to suggest more specific meals."
        )

    if any(keyword in lowered for keyword in ["workout", "exercise", "train", "gym", "strength", "cardio"]):
        if goal == "lose":
            return (
                f"For fat loss, a mix of strength training and steady cardio will work well with your {activity or 'current routine'}. "
                "Try a 30-minute full-body session today and finish with a brisk walk."
            )
        if goal == "gain":
            return (
                f"For muscle gain, keep your {activity or 'training'} focused on progressive overload. "
                "A push/pull/legs or upper/lower split with a protein-rich meal after training is a strong move."
            )
        return (
            f"For general fitness, your {activity or 'routine'} should balance movement, recovery, and consistency. "
            "Try a strength workout, a short cardio finisher, and a recovery walk later today."
        )

    if any(keyword in lowered for keyword in ["weight", "scale", "progress", "losing"]):
        if user.current_weight and user.goal_weight:
            diff = float(user.current_weight) - float(user.goal_weight)
            direction = "above" if diff > 0 else "below" if diff < 0 else "at"
            return (
                f"You’re {abs(diff):.1f} kg {direction} your goal weight right now. "
                "The best next step is to keep logging meals and track your weekly average instead of daily noise."
            )

    return (
        f"I’m here with you, {user.name or 'athlete'} 💪 Based on today’s data you’ve logged "
        f"{metrics['calories_consumed']:.0f} kcal, burned {metrics['calories_burned']:.0f} kcal, and had "
        f"{metrics['water_glasses']} glasses of water. If you want, I can help with food, workouts, weight trends, or calorie math."
    )


def get_user_context(user: User, db: Session) -> str:
    """Build comprehensive user context for AI coach."""
    metrics = get_daily_metrics(user, db)
    today = metrics["today"]
    
    # Section 1: USER PROFILE
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
    
    # Section 2: TODAY'S STATS
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
    
    # Section 3: FOODS LOGGED TODAY
    foods_list = "=== FOODS LOGGED TODAY ===\n"
    if metrics["food_logs_today"]:
        for food in metrics["food_logs_today"]:
            meal_type = food.meal_type or "Meal"
            foods_list += f"- {food.food_name} ({meal_type}): {food.calories} kcal\n"
    else:
        foods_list += "Nothing logged yet\n"
    
    # Section 4: WEIGHT TREND (last 7 entries)
    weight_logs = db.query(WeightLog).filter(
        WeightLog.user_id == user.id
    ).order_by(WeightLog.log_date.desc()).limit(7).all()
    
    weight_trend = "=== WEIGHT TREND (Last 7 Days) ===\n"
    if weight_logs:
        for log in reversed(weight_logs):
            weight_trend += f"- {log.log_date.strftime('%Y-%m-%d')}: {log.weight} kg\n"
    else:
        weight_trend += "No weight logs yet\n"
    
    # Section 5: WEEKLY AVERAGE
    seven_days_ago = today - timedelta(days=7)
    weekly_logs = db.query(FoodLog).filter(
        FoodLog.user_id == user.id,
        FoodLog.log_date >= seven_days_ago,
        FoodLog.log_date <= today
    ).all()
    
    if weekly_logs:
        dates = set(log.log_date for log in weekly_logs)
        total_calories = sum(log.calories for log in weekly_logs)
        avg_daily_calories = total_calories / len(dates) if dates else 0
        weekly_avg = f"=== WEEKLY AVERAGE ===\nAverage Daily Calories: {avg_daily_calories:.0f} kcal\n"
    else:
        weekly_avg = "=== WEEKLY AVERAGE ===\nNo data available yet\n"
    
    # Section 6: AI COACH INSTRUCTIONS
    instructions = """=== AI COACH INSTRUCTIONS ===
You are a personal AI fitness and nutrition coach inside the Deeplyfit app by Deepu and Deepthi.
App tagline: "Intelligently deep. Deeply fit."

STRICT RULES:
- Always reference the user's actual numbers provided above
- Never make up or estimate data not provided
- Be warm, motivating, and conversational
- Keep responses to 2-4 sentences unless the user asks for detailed analysis
- Use emojis naturally but not excessively
- When asked what to eat: suggest specific foods based on their remaining macros for the day
- When asked about logging: remind them to use the Diary tab for accurate tracking
- When asked for workouts: base suggestions on their fitness_goal and activity_level
- If data is missing or zero: acknowledge honestly
- Always end with encouragement or a clear next step
- Occasionally mention Deeplyfit warmly if natural
"""
    
    return profile + today_stats + foods_list + weight_trend + weekly_avg + instructions


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """AI Coach chat endpoint."""
    try:
        enforce_free_limit(current_user, "ai_message")

        # Step 1: Check if API key is configured
        if not GEMINI_API_KEY:
            generic_tips = {
                "weight_loss": "💡 Tip: Creating a calorie deficit is key. Log all your meals in the Diary tab to track accurately!",
                "muscle_gain": "💪 Tip: Aim for 0.8-1g protein per pound of body weight and track your workouts for progressive overload!",
                "general_fitness": "🏃 Tip: Mix cardio and strength training, stay consistent, and remember that nutrition fuels your workouts!",
            }
            goal = (current_user.fitness_goal or "general_fitness").lower()
            tip = generic_tips.get(goal, generic_tips["general_fitness"])
            
            return ChatResponse(
                response=f"Hey! 👋 The AI Coach is warming up right now. In the meantime: {tip}\n\nKeep logging your meals and workouts—your data helps me understand you better!"
            )
        
        # Step 2: Configure Gemini with API key
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel("gemini-2.5-pro")
        
        # Step 3: Build full prompt
        user_context = get_user_context(current_user, db)
        
        history_text = "=== CONVERSATION HISTORY ===\n"
        if request.history:
            for msg in request.history[-10:]:
                role_label = "User" if msg.role == "user" else "Assistant"
                history_text += f"{role_label}: {msg.content}\n"
        
        full_prompt = f"""{user_context}

{history_text}

=== CURRENT MESSAGE ===
User: {request.message}

Respond as the AI coach using the data above. Be specific, warm, and actionable."""
        
        # Step 4: Generate response
        response = model.generate_content(full_prompt)

        db.commit()

        return ChatResponse(response=response.text.strip())
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        metrics = get_daily_metrics(current_user, db)
        return ChatResponse(
            response=build_fallback_response(current_user, metrics, request.message)
        )
