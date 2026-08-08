from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models import User
from routes.auth import get_current_user
from datetime import datetime, timezone, timedelta
import razorpay
import os
import hmac
import hashlib
import json

router = APIRouter(prefix="/payments", tags=["payments"])

RAZORPAY_KEY_ID = os.getenv("RAZORPAY_KEY_ID", "")
RAZORPAY_KEY_SECRET = os.getenv("RAZORPAY_KEY_SECRET", "")
RAZORPAY_PLAN_MONTHLY = os.getenv("RAZORPAY_PLAN_MONTHLY", "")
RAZORPAY_PLAN_QUARTERLY = os.getenv("RAZORPAY_PLAN_QUARTERLY", "")
RAZORPAY_PLAN_HALF_YEAR = os.getenv("RAZORPAY_PLAN_HALF_YEAR", "")
RAZORPAY_PLAN_YEARLY = os.getenv("RAZORPAY_PLAN_YEARLY", "")
RAZORPAY_PLAN_ANNUAL = os.getenv("RAZORPAY_PLAN_ANNUAL", RAZORPAY_PLAN_YEARLY)

SUBSCRIPTION_PLANS = {
    "monthly": {
        "plan_id": RAZORPAY_PLAN_MONTHLY,
        "amount": 19900,
        "total_count": 12,
        "duration_days": 30,
        "premium_plan": "monthly",
    },
    "quarterly": {
        "plan_id": RAZORPAY_PLAN_QUARTERLY,
        "amount": 49900,
        "total_count": 1,
        "duration_days": 90,
        "premium_plan": "quarterly",
    },
    "half_year": {
        "plan_id": RAZORPAY_PLAN_HALF_YEAR,
        "amount": 99900,
        "total_count": 1,
        "duration_days": 180,
        "premium_plan": "half_year",
    },
    "annual": {
        "plan_id": RAZORPAY_PLAN_ANNUAL,
        "amount": 179900,
        "total_count": 1,
        "duration_days": 365,
        "premium_plan": "annual",
    },
}


def normalize_plan_type(value: str) -> str:
    plan_type = (value or "").strip().lower()
    return "annual" if plan_type == "yearly" else plan_type

class CreateSubscriptionRequest(BaseModel):
    plan_type: str

class VerifyPaymentRequest(BaseModel):
    razorpay_payment_id: str
    razorpay_subscription_id: str
    razorpay_signature: str


@router.post("/create-subscription")
def create_subscription(
    data: CreateSubscriptionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        plan_type = normalize_plan_type(data.plan_type)
        plan = SUBSCRIPTION_PLANS.get(plan_type)
        if not plan:
            raise HTTPException(status_code=400, detail="Invalid subscription plan")

        client = razorpay.Client(
            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
        )
        if not plan["plan_id"]:
            raise HTTPException(
                status_code=400,
                detail="Plan not configured"
            )

        subscription = client.subscription.create({
            "plan_id": plan["plan_id"],
            "customer_notify": 1,
            "total_count": plan["total_count"],
            "notes": {
                "user_id": str(current_user.id),
                "user_email": current_user.email,
                "plan_type": plan_type
            }
        })

        return {
            "subscription_id": subscription["id"],
            "razorpay_key": RAZORPAY_KEY_ID,
            "plan_type": plan_type,
            "amount": plan["amount"],
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/verify-payment")
def verify_payment(
    data: VerifyPaymentRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        msg = f"{data.razorpay_payment_id}|{data.razorpay_subscription_id}"
        expected_signature = hmac.new(
            RAZORPAY_KEY_SECRET.encode(),
            msg.encode(),
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(expected_signature, data.razorpay_signature):
            raise HTTPException(
                status_code=400,
                detail="Invalid payment signature"
            )

        client = razorpay.Client(
            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
        )
        subscription = client.subscription.fetch(
            data.razorpay_subscription_id
        )
        plan_type = normalize_plan_type(subscription.get(
            "notes", {}
        ).get("plan_type", "monthly"))
        plan = SUBSCRIPTION_PLANS.get(plan_type)
        if not plan:
            raise HTTPException(status_code=400, detail="Invalid subscription plan")

        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=plan["duration_days"])

        current_user.is_pro = 1
        current_user.subscription_id = data.razorpay_subscription_id
        current_user.pro_started_at = now
        current_user.pro_expires_at = expires_at

        # Synchronize the established feature gates with the Razorpay state.
        current_user.premium_status = "active"
        current_user.premium_plan = plan["premium_plan"]
        current_user.premium_activated_at = now
        current_user.premium_expires_at = expires_at

        db.commit()
        db.refresh(current_user)

        return {
            "success": True,
            "message": "Welcome to Deeplyfit PRO! 🎉",
            "plan_type": plan_type,
            "expires_at": current_user.pro_expires_at.isoformat()
        }

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/cancel-subscription")
def cancel_subscription(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        if not current_user.subscription_id:
            raise HTTPException(
                status_code=400,
                detail="No active subscription found"
            )

        client = razorpay.Client(
            auth=(RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET)
        )
        client.subscription.cancel(current_user.subscription_id)

        return {
            "success": True,
            "message": "Cancelled. PRO continues until billing period ends.",
            "expires_at": (
                current_user.pro_expires_at.isoformat()
                if current_user.pro_expires_at else None
            )
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/subscription-status")
def subscription_status(
    current_user: User = Depends(get_current_user)
):
    is_active = False
    if current_user.is_pro:
        is_active = not current_user.pro_expires_at or (
            current_user.pro_expires_at > datetime.now(timezone.utc)
        )

    return {
        "is_pro": bool(current_user.is_pro),
        "is_active": is_active,
        "expires_at": (
            current_user.pro_expires_at.isoformat()
            if current_user.pro_expires_at else None
        ),
        "subscription_id": current_user.subscription_id
    }


@router.post("/webhook")
async def razorpay_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        body = await request.body()
        signature = request.headers.get(
            "X-Razorpay-Signature", ""
        )
        webhook_secret = os.getenv(
            "RAZORPAY_WEBHOOK_SECRET", ""
        )

        expected = hmac.new(
            webhook_secret.encode(),
            body,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected):
            raise HTTPException(
                status_code=400,
                detail="Invalid webhook signature"
            )

        payload = json.loads(body)
        event = payload.get("event", "")

        if event == "subscription.charged":
            sub_id = payload["payload"]["subscription"]["entity"]["id"]
            user = db.query(User).filter(
                User.subscription_id == sub_id
            ).first()
            if user:
                subscription = payload["payload"]["subscription"]["entity"]
                plan_type = normalize_plan_type(
                    subscription.get("notes", {}).get("plan_type", "monthly")
                )
                plan = SUBSCRIPTION_PLANS.get(plan_type, SUBSCRIPTION_PLANS["monthly"])
                expires_at = datetime.now(timezone.utc) + timedelta(
                    days=plan["duration_days"]
                )
                user.is_pro = 1
                user.pro_expires_at = expires_at
                user.premium_status = "active"
                user.premium_plan = plan["premium_plan"]
                user.premium_expires_at = expires_at
                db.commit()

        return {"status": "ok"}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
