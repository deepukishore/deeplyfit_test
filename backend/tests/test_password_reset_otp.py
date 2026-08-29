import os
import re
import unittest
from unittest.mock import patch

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from auth.jwt import get_password_hash, verify_password
from database import Base
from models import PasswordResetToken, User
from routes.auth import forgot_password, reset_password, verify_password_reset_otp
from schemas import ForgotPasswordRequest, ResetPasswordRequest, VerifyPasswordResetOtpRequest


class PasswordResetOtpTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        self.user = User(
            email="member@example.com",
            name="Member",
            hashed_password=get_password_hash("old-password"),
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def send_otp(self):
        smtp_environment = {
            "SMTP_HOST": "smtp.example.com",
            "SMTP_PORT": "587",
            "SMTP_USER": "sender@example.com",
            "SMTP_PASS": "app-password",
            "SMTP_SENDER": "sender@example.com",
        }
        with patch.dict(os.environ, smtp_environment, clear=False), patch("routes.auth.smtplib.SMTP") as smtp:
            response = forgot_password(ForgotPasswordRequest(email=" MEMBER@example.com "), self.db)
            smtp_client = smtp.return_value.__enter__.return_value
            message = smtp_client.sendmail.call_args.args[2]

        match = re.search(r"Subject: (\d{6}) is your", message)
        self.assertIsNotNone(match)
        self.assertEqual(response["message"], "If that email exists, a verification code has been sent.")
        return match.group(1)

    def test_email_otp_can_be_exchanged_and_password_reset(self):
        otp = self.send_otp()
        stored = self.db.query(PasswordResetToken).one()
        self.assertTrue(stored.token.startswith("otp$"))
        self.assertNotIn(otp, stored.token)

        verified = verify_password_reset_otp(
            VerifyPasswordResetOtpRequest(email="member@example.com", otp=otp),
            self.db,
        )
        self.assertTrue(verified["reset_token"])
        self.assertNotEqual(verified["reset_token"], otp)

        reset_password(
            ResetPasswordRequest(token=verified["reset_token"], new_password="new-password"),
            self.db,
        )
        self.db.refresh(self.user)
        self.assertTrue(verify_password("new-password", self.user.hashed_password))

        with self.assertRaises(HTTPException) as reused:
            reset_password(
                ResetPasswordRequest(token=verified["reset_token"], new_password="another-password"),
                self.db,
            )
        self.assertEqual(reused.exception.status_code, 400)

    def test_five_incorrect_attempts_invalidate_the_otp(self):
        otp = self.send_otp()
        wrong_otp = "000000" if otp != "000000" else "999999"

        for _ in range(5):
            with self.assertRaises(HTTPException):
                verify_password_reset_otp(
                    VerifyPasswordResetOtpRequest(email="member@example.com", otp=wrong_otp),
                    self.db,
                )

        record = self.db.query(PasswordResetToken).one()
        self.assertEqual(record.used, 1)
        self.assertEqual(record.attempts, 5)
        with self.assertRaises(HTTPException):
            verify_password_reset_otp(
                VerifyPasswordResetOtpRequest(email="member@example.com", otp=otp),
                self.db,
            )

    def test_production_never_exposes_an_otp_when_smtp_is_missing(self):
        production_environment = {
            "RENDER": "true",
            "SECRET_KEY": "production-test-secret",
            "SMTP_USER": "",
            "SMTP_PASS": "",
            "MAIL_USERNAME": "",
            "MAIL_PASSWORD": "",
        }
        with patch.dict(os.environ, production_environment, clear=True):
            with self.assertRaises(HTTPException) as unavailable:
                forgot_password(ForgotPasswordRequest(email=self.user.email), self.db)

        self.assertEqual(unavailable.exception.status_code, 503)
        self.assertNotIn("otp", unavailable.exception.detail.lower())
        record = self.db.query(PasswordResetToken).one()
        self.assertEqual(record.used, 1)


if __name__ == "__main__":
    unittest.main()
