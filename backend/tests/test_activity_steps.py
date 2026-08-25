import unittest
from datetime import date

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from database import Base
from models import StepLog, User
from routes.activity import get_step_history, get_steps_for_date, sync_steps
from schemas import StepLogCreate


class ActivityStepTests(unittest.TestCase):
    def setUp(self):
        self.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        Base.metadata.create_all(bind=self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()
        self.user = User(email="walker@example.com", hashed_password="unused")
        self.db.add(self.user)
        self.db.commit()
        self.db.refresh(self.user)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(bind=self.engine)
        self.engine.dispose()

    def test_sync_keeps_largest_same_day_total(self):
        log_date = date(2026, 8, 25)
        sync_steps(StepLogCreate(date=log_date, steps=4200, source="health_connect"), self.db, self.user)
        result = sync_steps(StepLogCreate(date=log_date, steps=3900, source="health_connect"), self.db, self.user)

        self.assertEqual(result.steps, 4200)
        self.assertEqual(self.db.query(StepLog).count(), 1)

    def test_empty_day_and_history(self):
        log_date = date(2026, 8, 25)
        empty = get_steps_for_date(log_date, self.db, self.user)
        self.assertEqual(empty.steps, 0)
        self.assertEqual(get_step_history(7, self.db, self.user), [])


if __name__ == "__main__":
    unittest.main()
