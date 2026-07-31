import os
import unittest
from unittest.mock import patch

from auth.jwt import LOCAL_DEVELOPMENT_SECRET, get_secret_key
from fastapi import HTTPException

from routes.auth import get_frontend_url, get_smtp_settings


class ReleaseConfigurationTests(unittest.TestCase):
    def test_production_requires_an_explicit_jwt_secret(self):
        with patch.dict(
            os.environ,
            {"RENDER": "true", "SECRET_KEY": "", "ENVIRONMENT": "production"},
            clear=False,
        ):
            with self.assertRaisesRegex(RuntimeError, "SECRET_KEY"):
                get_secret_key()

    def test_local_development_can_use_non_production_fallback(self):
        with patch.dict(os.environ, {}, clear=True):
            self.assertEqual(get_secret_key(), LOCAL_DEVELOPMENT_SECRET)

    def test_smtp_credentials_have_no_committed_fallback(self):
        with patch.dict(os.environ, {}, clear=True):
            host, port, user, password, sender = get_smtp_settings()

        self.assertEqual(host, "smtp.gmail.com")
        self.assertEqual(port, 587)
        self.assertEqual(user, "")
        self.assertEqual(password, "")
        self.assertEqual(sender, "")

    def test_production_requires_frontend_url_for_reset_links(self):
        with patch.dict(os.environ, {"RENDER": "true"}, clear=True):
            with self.assertRaises(HTTPException) as missing_url:
                get_frontend_url()

        self.assertEqual(missing_url.exception.status_code, 500)
        self.assertIn("FRONTEND_URL", missing_url.exception.detail)

    def test_frontend_url_is_normalized(self):
        with patch.dict(
            os.environ,
            {"FRONTEND_URL": "https://deeplyfit.vercel.app/"},
            clear=True,
        ):
            self.assertEqual(get_frontend_url(), "https://deeplyfit.vercel.app")


if __name__ == "__main__":
    unittest.main()
