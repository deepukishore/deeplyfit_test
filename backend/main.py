from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text
from sqlalchemy.orm import Session
import os

from database import engine, Base, get_db
import models
from routes import auth, users, food_logs, workouts, water_logs, weight_logs, meal_templates, achievements, ai_chat, meal_plans, community
from routes.auth import get_current_user
from schemas import FoodScanRequest, FoodLogCreate
from ai.gemini_food import analyze_food_image
from models import FoodLog, User
from utils.premium import enforce_free_limit

# Create all tables
Base.metadata.create_all(bind=engine)


def ensure_user_premium_columns():
    inspector = inspect(engine)
    if "users" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("users")}
    column_statements = {
        "premium_status": "ALTER TABLE users ADD COLUMN premium_status VARCHAR(20) DEFAULT 'free'",
        "premium_plan": "ALTER TABLE users ADD COLUMN premium_plan VARCHAR(20) NULL",
        "premium_activated_at": "ALTER TABLE users ADD COLUMN premium_activated_at DATETIME NULL",
        "premium_expires_at": "ALTER TABLE users ADD COLUMN premium_expires_at DATETIME NULL",
        "premium_payment_ref": "ALTER TABLE users ADD COLUMN premium_payment_ref VARCHAR(120) NULL",
        "free_ai_scans_used": "ALTER TABLE users ADD COLUMN free_ai_scans_used INTEGER DEFAULT 0",
        "free_ai_scans_reset_on": "ALTER TABLE users ADD COLUMN free_ai_scans_reset_on DATE NULL",
        "free_ai_messages_used": "ALTER TABLE users ADD COLUMN free_ai_messages_used INTEGER DEFAULT 0",
        "free_ai_messages_reset_on": "ALTER TABLE users ADD COLUMN free_ai_messages_reset_on DATE NULL",
    }

    with engine.begin() as connection:
        for column_name, ddl in column_statements.items():
            if column_name not in existing_columns:
                connection.execute(text(ddl))


ensure_user_premium_columns()

app = FastAPI(title="Deeply Fit API", version="1.0.0")


def get_cors_origins():
    origins = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
    return [origin.strip() for origin in origins.split(",") if origin.strip()]


# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(food_logs.router)
app.include_router(workouts.router)
app.include_router(water_logs.router)
app.include_router(weight_logs.router)
app.include_router(meal_templates.router)
app.include_router(achievements.router)
app.include_router(ai_chat.router)
app.include_router(meal_plans.router)
app.include_router(community.router)


@app.get("/")
def root():
    return {"message": "FitTrack AI API is running!", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/food/scan")
def scan_food(
    data: FoodScanRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        enforce_free_limit(current_user, "ai_scan")
        db.commit()
        result = analyze_food_image(data.image_base64)

        # Auto-save to food log
        log = FoodLog(
            user_id=current_user.id,
            date=data.date,
            meal_type=data.meal_type,
            food_name=result["name"],
            calories=result["calories"],
            protein=result["protein"],
            carbs=result["carbs"],
            fat=result["fat"],
            quantity=1
        )
        db.add(log)
        db.commit()
        db.refresh(log)

        return {
            "food_data": result,
            "log_id": log.id,
            "message": "Food scanned and logged successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
