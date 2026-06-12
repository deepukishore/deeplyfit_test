from datetime import date, datetime, timedelta
from fastapi import HTTPException

UPI_ID = "deepu004.dk-4@okaxis"
PAYMENT_DETAILS = {
    "monthly": {"price": 199, "duration_days": 30, "label": "Monthly"},
    "annual": {"price": 1999, "duration_days": 365, "label": "Annual"},
}

FREE_LIMITS = {
    "ai_scan": 3,
    "ai_message": 10,
}


def is_premium_active(user) -> bool:
    if getattr(user, "premium_status", "free") != "active":
        return False
    expires_at = getattr(user, "premium_expires_at", None)
    return not expires_at or expires_at > datetime.utcnow()


def get_subscription_status(user) -> str:
    if is_premium_active(user):
        return "active"
    if getattr(user, "premium_status", "free") == "active":
        return "expired"
    return getattr(user, "premium_status", "free") or "free"


def _ensure_daily_counter(user, feature: str, today: date):
    if feature == "ai_scan":
        if getattr(user, "free_ai_scans_reset_on", None) != today:
            user.free_ai_scans_reset_on = today
            user.free_ai_scans_used = 0
    elif feature == "ai_message":
        if getattr(user, "free_ai_messages_reset_on", None) != today:
            user.free_ai_messages_reset_on = today
            user.free_ai_messages_used = 0


def enforce_free_limit(user, feature: str):
    if is_premium_active(user):
        return

    today = date.today()
    _ensure_daily_counter(user, feature, today)

    if feature == "ai_scan":
        limit = FREE_LIMITS["ai_scan"]
        used = int(getattr(user, "free_ai_scans_used", 0) or 0)
        if used >= limit:
            raise HTTPException(
                status_code=402,
                detail="You've used all your free scans for today. Upgrade to PRO for unlimited AI food scanning ✨",
            )
        user.free_ai_scans_used = used + 1
        return

    if feature == "ai_message":
        limit = FREE_LIMITS["ai_message"]
        used = int(getattr(user, "free_ai_messages_used", 0) or 0)
        if used >= limit:
            raise HTTPException(
                status_code=402,
                detail="You've used all your free AI coach messages for today. Upgrade to PRO for unlimited messages and memory ✨",
            )
        user.free_ai_messages_used = used + 1
        return

    raise HTTPException(status_code=400, detail="Unknown premium feature")


def build_premium_expiry(plan: str) -> datetime:
    plan_key = plan.lower()
    if plan_key not in PAYMENT_DETAILS:
        raise HTTPException(status_code=400, detail="Invalid premium plan")
    days = PAYMENT_DETAILS[plan_key]["duration_days"]
    return datetime.utcnow() + timedelta(days=days)
