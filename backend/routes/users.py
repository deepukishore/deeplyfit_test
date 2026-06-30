import os
import re
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session
from database import get_db
from models import User, FoodLog, WaterLog, WeightLog, Workout, CommunityPost
from schemas import OnboardingData, PublicProfileResponse, UserUpdate, UserResponse, AllergenUpdate, PremiumActivationRequest, PremiumApprovalRequest
from routes.auth import get_current_user
from utils.achievements import build_achievements
from utils.community import serialize_post
from utils.profile import ensure_unique_public_slug
from utils.allergens import serialize_allergens, deserialize_allergens
from utils.premium import PAYMENT_DETAILS, get_subscription_status, is_premium_active
from datetime import datetime, timedelta

router = APIRouter(prefix="/users", tags=["users"])

PAYMENT_REFERENCE_PATTERN = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._/-]{7,63}$")


def normalize_payment_reference(value: str) -> str:
    reference = (value or "").strip()
    if not PAYMENT_REFERENCE_PATTERN.fullmatch(reference):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid UPI transaction reference or UTR, 8-64 characters.",
        )
    return reference


def ensure_payment_reference_is_unused(db: Session, reference: str, current_user_id: int | None = None):
    existing_user = db.query(User).filter(
        or_(
            User.premium_payment_ref == reference,
            User.premium_pending_payment_ref == reference,
        )
    ).first()
    if existing_user and existing_user.id != current_user_id:
        raise HTTPException(status_code=409, detail="This payment reference was already submitted")


@router.post("/premium/activate", response_model=UserResponse)
def activate_premium(
    data: PremiumActivationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    plan = data.plan.lower()
    if plan not in PAYMENT_DETAILS:
        raise HTTPException(status_code=400, detail="Invalid premium plan")
    payment_reference = normalize_payment_reference(data.payment_reference)
    ensure_payment_reference_is_unused(db, payment_reference, current_user.id)

    try:
        now = datetime.utcnow()
        if not is_premium_active(current_user):
            current_user.premium_status = "pending"
        current_user.premium_pending_plan = plan
        current_user.premium_pending_payment_ref = payment_reference
        current_user.premium_pending_requested_at = now
        db.commit()
        db.refresh(current_user)
        return current_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/premium/approve", response_model=UserResponse)
def approve_premium_payment(
    data: PremiumApprovalRequest,
    db: Session = Depends(get_db),
):
    admin_key = os.getenv("PREMIUM_ADMIN_KEY", "").strip()
    if not admin_key:
        raise HTTPException(status_code=503, detail="Premium approval is not configured")
    if data.admin_key != admin_key:
        raise HTTPException(status_code=403, detail="Invalid premium admin key")

    payment_reference = normalize_payment_reference(data.payment_reference)
    user = db.query(User).filter(User.premium_pending_payment_ref == payment_reference).first()
    if not user:
        raise HTTPException(status_code=404, detail="Pending payment reference not found")

    plan = (user.premium_pending_plan or "").lower()
    if plan not in PAYMENT_DETAILS:
        raise HTTPException(status_code=400, detail="Pending payment has an invalid plan")

    try:
        now = datetime.utcnow()
        current_expires = user.premium_expires_at if is_premium_active(user) else None
        base_time = current_expires if current_expires and current_expires > now else now
        extension_days = PAYMENT_DETAILS[plan]["duration_days"]
        user.premium_status = "active"
        user.premium_plan = plan
        user.premium_activated_at = now
        user.premium_expires_at = base_time + timedelta(days=extension_days)
        user.premium_payment_ref = payment_reference
        user.premium_pending_plan = None
        user.premium_pending_payment_ref = None
        user.premium_pending_requested_at = None
        db.commit()
        db.refresh(user)
        return user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/premium/status")
def premium_status(current_user: User = Depends(get_current_user)):
    return {
        "status": get_subscription_status(current_user),
        "is_premium": is_premium_active(current_user),
        "plan": current_user.premium_plan,
        "activated_at": current_user.premium_activated_at,
        "expires_at": current_user.premium_expires_at,
        "pending_plan": current_user.premium_pending_plan,
        "pending_payment_ref": current_user.premium_pending_payment_ref,
        "pending_requested_at": current_user.premium_pending_requested_at,
        "upi_id": "deepu004.dk-4@okaxis",
        "plans": {
            key: {"price": value["price"], "duration_days": value["duration_days"], "label": value["label"]}
            for key, value in PAYMENT_DETAILS.items()
        },
    }


def calculate_bmr(weight: float, height: float, age: int, gender: str) -> float:
    if gender.lower() == "male":
        return 10 * weight + 6.25 * height - 5 * age + 5
    else:
        return 10 * weight + 6.25 * height - 5 * age - 161


def calculate_tdee(bmr: float, activity_level: str) -> float:
    multipliers = {
        "sedentary": 1.2,
        "lightly_active": 1.375,
        "moderately_active": 1.55,
        "very_active": 1.725,
        "extra_active": 1.9,
    }
    return bmr * multipliers.get(activity_level, 1.375)


def calculate_targets(tdee: float, fitness_goal: str, weight: float):
    if fitness_goal == "lose":
        calorie_target = tdee - 500
    elif fitness_goal == "gain":
        calorie_target = tdee + 300
    else:
        calorie_target = tdee

    protein = weight * 2.0
    fat = calorie_target * 0.25 / 9
    carbs = (calorie_target - protein * 4 - fat * 9) / 4

    return max(calorie_target, 1200), protein, max(carbs, 0), fat


@router.post("/onboarding", response_model=UserResponse)
def complete_onboarding(
    data: OnboardingData,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        bmr = calculate_bmr(data.current_weight, data.height, data.age, data.gender)
        tdee = calculate_tdee(bmr, data.activity_level)
        cal_target, protein, carbs, fat = calculate_targets(tdee, data.fitness_goal, data.current_weight)

        current_user.age = data.age
        current_user.gender = data.gender
        current_user.height = data.height
        current_user.current_weight = data.current_weight
        current_user.goal_weight = data.goal_weight
        current_user.activity_level = data.activity_level
        current_user.fitness_goal = data.fitness_goal
        current_user.bmr = round(bmr, 1)
        current_user.tdee = round(tdee, 1)
        current_user.calorie_target = round(cal_target, 1)
        current_user.protein_target = round(protein, 1)
        current_user.carbs_target = round(carbs, 1)
        current_user.fat_target = round(fat, 1)
        current_user.onboarding_complete = 1
        if not current_user.public_profile_slug:
            current_user.public_profile_slug = ensure_unique_public_slug(
                db,
                current_user.name or current_user.email.split("@")[0],
                exclude_user_id=current_user.id,
            )

        db.commit()
        db.refresh(current_user)
        return current_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/profile", response_model=UserResponse)
def update_profile(
    data: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        if data.name is not None:
            current_user.name = data.name
        if data.goal_weight is not None:
            current_user.goal_weight = data.goal_weight
        if data.activity_level is not None:
            current_user.activity_level = data.activity_level
        if data.fitness_goal is not None:
            current_user.fitness_goal = data.fitness_goal
        if data.dark_mode is not None:
            current_user.dark_mode = data.dark_mode
        if data.water_goal is not None:
            current_user.water_goal = max(1, min(data.water_goal, 30))
        if data.bio is not None:
            current_user.bio = data.bio
        if data.profile_visibility is not None:
            current_user.profile_visibility = data.profile_visibility if data.profile_visibility in {"public", "private"} else "public"
        if data.share_achievements is not None:
            current_user.share_achievements = 1 if data.share_achievements else 0
        if data.public_profile_slug is not None and data.public_profile_slug.strip():
            current_user.public_profile_slug = ensure_unique_public_slug(
                db,
                data.public_profile_slug,
                exclude_user_id=current_user.id,
            )
        if data.allergens is not None:
            current_user.allergens_json = serialize_allergens(data.allergens)

        if (
            current_user.current_weight
            and current_user.height
            and current_user.age
            and current_user.gender
            and current_user.activity_level
            and current_user.fitness_goal
        ):
            bmr = calculate_bmr(current_user.current_weight, current_user.height, current_user.age, current_user.gender)
            tdee = calculate_tdee(bmr, current_user.activity_level)
            cal_target, protein, carbs, fat = calculate_targets(tdee, current_user.fitness_goal, current_user.current_weight)
            current_user.bmr = round(bmr, 1)
            current_user.tdee = round(tdee, 1)
            current_user.calorie_target = round(cal_target, 1)
            current_user.protein_target = round(protein, 1)
            current_user.carbs_target = round(carbs, 1)
            current_user.fat_target = round(fat, 1)

        db.commit()
        db.refresh(current_user)
        return current_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/public/{slug}", response_model=PublicProfileResponse)
def get_public_profile(
    slug: str,
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.public_profile_slug == slug).first()
    if not user or user.profile_visibility == "private":
        raise HTTPException(status_code=404, detail="Profile not found")

    food_logs = db.query(FoodLog).filter(FoodLog.user_id == user.id).all()
    water_logs = db.query(WaterLog).filter(WaterLog.user_id == user.id).all()
    weight_logs = db.query(WeightLog).filter(WeightLog.user_id == user.id).all()
    workouts = db.query(Workout).filter(Workout.user_id == user.id).all()
    achievements = build_achievements(user, food_logs, water_logs, weight_logs, workouts)
    recent_posts = db.query(CommunityPost).filter(
        CommunityPost.user_id == user.id
    ).order_by(CommunityPost.created_at.desc()).limit(6).all()
    total_posts = db.query(CommunityPost).filter(CommunityPost.user_id == user.id).count()

    return PublicProfileResponse(
        name=user.name,
        bio=user.bio,
        public_profile_slug=user.public_profile_slug,
        fitness_goal=user.fitness_goal,
        activity_level=user.activity_level,
        share_achievements=user.share_achievements,
        stats={
            "calorie_target": user.calorie_target,
            "protein_target": user.protein_target,
            "carbs_target": user.carbs_target,
            "fat_target": user.fat_target,
            "current_weight": user.current_weight,
            "goal_weight": user.goal_weight,
            "total_posts": total_posts,
            "achievements_unlocked": sum(1 for achievement in achievements if achievement["unlocked"]) if user.share_achievements else 0,
        },
        recent_posts=[serialize_post(post) for post in recent_posts],
    )


@router.put("/allergens", response_model=UserResponse)
def update_allergens(
    data: AllergenUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        current_user.allergens_json = serialize_allergens(data.allergens)
        db.commit()
        db.refresh(current_user)
        return current_user
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/allergens")
def get_allergens(
    current_user: User = Depends(get_current_user)
):
    allergens = deserialize_allergens(current_user.allergens_json)
    return {"allergens": allergens}
