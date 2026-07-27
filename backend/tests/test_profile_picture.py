import unittest

from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from models import User
from routes.users import update_profile
from schemas import UserUpdate


class ProfilePictureTests(unittest.TestCase):
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
            email="avatar@example.com",
            hashed_password="hashed",
            name="Avatar User",
        )
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def test_built_in_avatar_can_be_saved_and_removed(self):
        updated = update_profile(UserUpdate(profile_picture="avatar-7"), self.db, self.user)
        self.assertEqual(updated.profile_picture, "avatar-7")

        cleared = update_profile(UserUpdate(profile_picture=""), self.db, self.user)
        self.assertIsNone(cleared.profile_picture)

    def test_external_image_urls_are_rejected(self):
        with self.assertRaises(ValidationError):
            UserUpdate(profile_picture="https://example.com/avatar.jpg")


if __name__ == "__main__":
    unittest.main()
