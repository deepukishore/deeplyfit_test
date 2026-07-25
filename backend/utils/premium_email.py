import os
import smtplib
import ssl
from dataclasses import dataclass
from datetime import datetime
from email.message import EmailMessage

from utils.premium import PAYMENT_DETAILS, UPI_ID
from utils.time import as_utc


DEFAULT_PREMIUM_ADMIN_EMAIL = "deeplyfitai@gmail.com"
PLACEHOLDER_VALUES = {
    "",
    "your_gmail@gmail.com",
    "your_app_password",
    "your-email@gmail.com",
    "your-password",
}


class PremiumEmailNotConfiguredError(RuntimeError):
    pass


class PremiumEmailDeliveryError(RuntimeError):
    pass


@dataclass(frozen=True)
class SmtpSettings:
    host: str
    port: int
    username: str
    password: str
    sender: str
    recipient: str


def _first_configured_value(*values: str) -> str:
    for value in values:
        normalized = (value or "").strip()
        if normalized and normalized not in PLACEHOLDER_VALUES:
            return normalized
    return ""


def get_smtp_settings() -> SmtpSettings:
    host = (os.getenv("SMTP_HOST", "smtp.gmail.com") or "").strip()
    username = _first_configured_value(
        os.getenv("SMTP_USER", ""),
        os.getenv("MAIL_USERNAME", ""),
    )
    password = _first_configured_value(
        os.getenv("SMTP_PASS", ""),
        os.getenv("MAIL_PASSWORD", ""),
    )
    sender = _first_configured_value(
        os.getenv("SMTP_SENDER", ""),
        os.getenv("MAIL_DEFAULT_SENDER", ""),
        username,
    )
    recipient = (
        os.getenv("PREMIUM_ADMIN_EMAIL", DEFAULT_PREMIUM_ADMIN_EMAIL) or ""
    ).strip()

    try:
        port = int(os.getenv("SMTP_PORT", "587"))
    except (TypeError, ValueError) as exc:
        raise PremiumEmailNotConfiguredError("SMTP_PORT must be a valid number.") from exc

    if not host or not username or not password or not sender:
        raise PremiumEmailNotConfiguredError(
            "Premium verification email is not configured. "
            "Set SMTP_HOST, SMTP_PORT, SMTP_USER, and SMTP_PASS."
        )
    if not recipient:
        raise PremiumEmailNotConfiguredError("PREMIUM_ADMIN_EMAIL is not configured.")

    return SmtpSettings(
        host=host,
        port=port,
        username=username,
        password=password,
        sender=sender,
        recipient=recipient,
    )


def _display(value, suffix: str = "") -> str:
    if value is None or value == "":
        return "Not provided"
    return f"{value}{suffix}"


def _format_utc(value: datetime | None) -> str:
    normalized = as_utc(value)
    if normalized is None:
        return "Not provided"
    return normalized.strftime("%Y-%m-%d %H:%M:%S UTC")


def build_premium_verification_message(
    *,
    user,
    plan: str,
    payment_reference: str,
    payment_method: str,
    requested_at: datetime,
    sender: str,
    recipient: str,
) -> EmailMessage:
    plan_details = PAYMENT_DETAILS[plan]
    plan_label = plan_details["label"]

    body = f"""A Deeply Fit user has requested premium payment verification.

TRANSACTION DETAILS
-------------------
Status: Pending admin verification
UPI transaction reference / UTR: {payment_reference}
Payment method: {payment_method.upper()}
Paid to UPI ID: {UPI_ID}
Selected plan: {plan_label}
Expected amount: INR {plan_details["price"]}
Plan duration: {plan_details["duration_days"]} days
Submitted at: {_format_utc(requested_at)}

USER PROFILE DETAILS
--------------------
User ID: {_display(getattr(user, "id", None))}
Name: {_display(getattr(user, "name", None))}
Email: {_display(getattr(user, "email", None))}
Account created: {_format_utc(getattr(user, "created_at", None))}
Onboarding completed: {"Yes" if getattr(user, "onboarding_complete", 0) else "No"}
Age: {_display(getattr(user, "age", None))}
Gender: {_display(getattr(user, "gender", None))}
Height: {_display(getattr(user, "height", None), " cm")}
Current weight: {_display(getattr(user, "current_weight", None), " kg")}
Goal weight: {_display(getattr(user, "goal_weight", None), " kg")}
Activity level: {_display(getattr(user, "activity_level", None))}
Fitness goal: {_display(getattr(user, "fitness_goal", None))}
Public profile slug: {_display(getattr(user, "public_profile_slug", None))}

APPROVAL
--------
Confirm that the UPI reference, recipient, and amount match the payment record.
Once confirmed, approve the request through:
POST /users/premium/approve

Use the transaction reference shown above and the server's configured
PREMIUM_ADMIN_KEY. Do not approve the request if any payment detail differs.

-- Deeply Fit automated payment verification
"""

    message = EmailMessage()
    message["Subject"] = f"Premium payment verification: {plan_label} - {payment_reference}"
    message["From"] = sender
    message["To"] = recipient
    message.set_content(body)
    return message


def send_premium_verification_email(
    *,
    user,
    plan: str,
    payment_reference: str,
    payment_method: str,
    requested_at: datetime,
) -> None:
    settings = get_smtp_settings()
    message = build_premium_verification_message(
        user=user,
        plan=plan,
        payment_reference=payment_reference,
        payment_method=payment_method,
        requested_at=requested_at,
        sender=settings.sender,
        recipient=settings.recipient,
    )

    try:
        with smtplib.SMTP(settings.host, settings.port, timeout=20) as server:
            server.starttls(context=ssl.create_default_context())
            server.login(settings.username, settings.password)
            server.send_message(message)
    except (OSError, smtplib.SMTPException) as exc:
        raise PremiumEmailDeliveryError(
            f"Could not send premium verification email to {settings.recipient}."
        ) from exc
