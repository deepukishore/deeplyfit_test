import os
import unittest
from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from fastapi import HTTPException
from routes.users import activate_premium
from schemas import PremiumActivationRequest
from utils.premium_email import (
    DEFAULT_PREMIUM_ADMIN_EMAIL,
    build_premium_verification_message,
    PremiumEmailDeliveryError,
    send_premium_verification_email,
)


def sample_user():
    return SimpleNamespace(
        id=42,
        name="Alex Johnson",
        email="alex@example.com",
        created_at=datetime(2026, 1, 2, 3, 4, tzinfo=timezone.utc),
        onboarding_complete=1,
        age=30,
        gender="male",
        height=180,
        current_weight=80,
        goal_weight=75,
        activity_level="moderately_active",
        fitness_goal="lose",
        public_profile_slug="alex-johnson",
    )


class PremiumVerificationEmailTests(unittest.TestCase):
    def test_message_contains_transaction_and_profile_details(self):
        message = build_premium_verification_message(
            user=sample_user(),
            plan="monthly",
            payment_reference="123456789012",
            payment_method="upi",
            requested_at=datetime(2026, 7, 25, 10, 30, tzinfo=timezone.utc),
            sender="sender@example.com",
            recipient=DEFAULT_PREMIUM_ADMIN_EMAIL,
        )

        body = message.get_content()
        self.assertEqual(message["To"], "deeplyfitai@gmail.com")
        self.assertIn("123456789012", body)
        self.assertIn("Expected amount: INR 99", body)
        self.assertIn("Alex Johnson", body)
        self.assertIn("alex@example.com", body)
        self.assertIn("POST /users/premium/approve", body)

    @patch("utils.premium_email.smtplib.SMTP")
    def test_send_uses_configured_admin_recipient(self, smtp_mock):
        smtp_client = MagicMock()
        smtp_mock.return_value.__enter__.return_value = smtp_client
        env = {
            "SMTP_HOST": "smtp.example.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "sender@example.com",
            "SMTP_PASS": "app-password",
            "SMTP_SENDER": "sender@example.com",
            "PREMIUM_ADMIN_EMAIL": "deeplyfitai@gmail.com",
        }

        with patch.dict(os.environ, env, clear=False):
            send_premium_verification_email(
                user=sample_user(),
                plan="annual",
                payment_reference="ABCDEF123456",
                payment_method="upi",
                requested_at=datetime(2026, 7, 25, 10, 30, tzinfo=timezone.utc),
            )

        sent_message = smtp_client.send_message.call_args.args[0]
        self.assertEqual(sent_message["To"], "deeplyfitai@gmail.com")
        self.assertIn("Expected amount: INR 999", sent_message.get_content())
        smtp_client.starttls.assert_called_once()
        smtp_client.login.assert_called_once_with("sender@example.com", "app-password")

    @patch("routes.users.ensure_payment_reference_is_unused")
    @patch("routes.users.send_premium_verification_email")
    def test_submission_is_saved_after_notification_succeeds(
        self,
        send_email_mock,
        _unused_reference_mock,
    ):
        db = MagicMock()
        user = sample_user()
        user.premium_status = "free"
        user.premium_expires_at = None
        request = PremiumActivationRequest(
            plan="monthly",
            payment_reference="123456789012",
            payment_method="upi",
        )

        result = activate_premium(request, db=db, current_user=user)

        self.assertIs(result, user)
        self.assertEqual(user.premium_status, "pending")
        self.assertEqual(user.premium_pending_plan, "monthly")
        self.assertEqual(user.premium_pending_payment_ref, "123456789012")
        db.flush.assert_called_once()
        send_email_mock.assert_called_once()
        db.commit.assert_called_once()
        db.rollback.assert_not_called()

    @patch("routes.users.ensure_payment_reference_is_unused")
    @patch(
        "routes.users.send_premium_verification_email",
        side_effect=PremiumEmailDeliveryError("delivery failed"),
    )
    def test_submission_rolls_back_when_notification_fails(
        self,
        _send_email_mock,
        _unused_reference_mock,
    ):
        db = MagicMock()
        user = sample_user()
        user.premium_status = "free"
        user.premium_expires_at = None
        request = PremiumActivationRequest(
            plan="annual",
            payment_reference="ABCDEF123456",
            payment_method="upi",
        )

        with self.assertRaises(HTTPException) as raised:
            activate_premium(request, db=db, current_user=user)

        self.assertEqual(raised.exception.status_code, 502)
        db.rollback.assert_called_once()
        db.commit.assert_not_called()


if __name__ == "__main__":
    unittest.main()
