import unittest
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

from routes import ai_chat
from utils.premium import build_premium_expiry, is_premium_active
from utils.time import as_utc, is_past, utc_now


class PremiumTimeTests(unittest.TestCase):
    def test_active_premium_accepts_timezone_aware_expiry(self):
        user = SimpleNamespace(
            premium_status="active",
            premium_expires_at=datetime.now(timezone.utc) + timedelta(days=1),
        )
        self.assertTrue(is_premium_active(user))

    def test_active_premium_accepts_legacy_naive_expiry(self):
        user = SimpleNamespace(
            premium_status="active",
            premium_expires_at=datetime.now(timezone.utc).replace(tzinfo=None) + timedelta(days=1),
        )
        self.assertTrue(is_premium_active(user))

    def test_expired_premium_is_inactive_for_aware_and_naive_values(self):
        for expires_at in (
            datetime.now(timezone.utc) - timedelta(seconds=1),
            datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(seconds=1),
        ):
            with self.subTest(expires_at=expires_at):
                user = SimpleNamespace(
                    premium_status="active",
                    premium_expires_at=expires_at,
                )
                self.assertFalse(is_premium_active(user))

    def test_generated_expiry_and_helpers_use_utc(self):
        expiry = build_premium_expiry("monthly")
        self.assertIsNotNone(expiry.tzinfo)
        self.assertGreater(expiry, utc_now())
        naive_utc = datetime.now(timezone.utc).replace(tzinfo=None)
        self.assertEqual(as_utc(naive_utc).utcoffset(), timedelta(0))
        self.assertTrue(is_past(utc_now() - timedelta(seconds=1)))


class AICoachFallbackTests(unittest.TestCase):
    def test_model_fallbacks_only_use_supported_stable_models(self):
        models = ai_chat.get_gemini_model_names("custom-model")
        self.assertEqual(models[0], "custom-model")
        self.assertIn("gemini-2.5-flash-lite", models)
        self.assertIn("gemini-2.5-flash", models)
        self.assertNotIn("gemini-2.0-flash", models)

    def test_quota_error_returns_limited_mode_instead_of_http_error(self):
        user = SimpleNamespace(id=7)
        db = MagicMock()
        request = ai_chat.ChatRequest(message="How much protein is left?", history=[])

        model = MagicMock()
        model.generate_content.side_effect = RuntimeError("429 RESOURCE_EXHAUSTED quota exceeded")

        with (
            patch.object(ai_chat, "GEMINI_API_KEY", "test-key"),
            patch.object(ai_chat, "enforce_free_limit"),
            patch.object(ai_chat, "get_user_context", return_value="user context"),
            patch.object(ai_chat, "build_quota_fallback_response", return_value="Data-based answer"),
            patch.object(ai_chat.genai, "configure"),
            patch.object(ai_chat.genai, "GenerativeModel", return_value=model),
        ):
            response = ai_chat.chat(request, current_user=user, db=db)

        self.assertEqual(response.mode, "limited")
        self.assertEqual(response.response, "Data-based answer")
        self.assertIn("quota", response.notice.lower())
        db.commit.assert_called_once()
        db.rollback.assert_not_called()


if __name__ == "__main__":
    unittest.main()
