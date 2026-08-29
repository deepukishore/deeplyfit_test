import os
import unittest
from unittest.mock import patch

from auth.jwt import LOCAL_DEVELOPMENT_SECRET, get_secret_key
from routes.auth import get_smtp_settings


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

if __name__ == "__main__":
    unittest.main()
