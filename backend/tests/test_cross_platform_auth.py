import unittest

from fastapi import HTTPException
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from models import User
from routes.auth import login, register
from schemas import UserCreate, UserLogin


class CrossPlatformAuthTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def test_account_created_by_one_client_logs_in_from_the_other(self):
        created = register(
            UserCreate(
                email="  Mobile.User@Example.COM ",
                password="shared-secret",
                name=" Mobile User ",
            ),
            self.db,
        )

        signed_in = login(
            UserLogin(email="mobile.user@example.com", password="shared-secret"),
            self.db,
        )
        stored_user = self.db.query(User).one()

        self.assertTrue(created["access_token"])
        self.assertTrue(signed_in["access_token"])
        self.assertEqual(stored_user.email, "mobile.user@example.com")
        self.assertEqual(stored_user.name, "Mobile User")

    def test_email_identity_is_unique_across_case_and_whitespace(self):
        register(
            UserCreate(email="member@example.com", password="shared-secret"),
            self.db,
        )

        with self.assertRaises(HTTPException) as duplicate:
            register(
                UserCreate(
                    email=" MEMBER@EXAMPLE.COM ",
                    password="another-secret",
                ),
                self.db,
            )

        self.assertEqual(duplicate.exception.status_code, 400)
        self.assertEqual(self.db.query(User).count(), 1)


if __name__ == "__main__":
    unittest.main()
