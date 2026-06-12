"""
One-time migration script to sync database schema with SQLAlchemy models.
Run with: python migrate.py
"""
from database import engine, Base
import models  # noqa: F401
from sqlalchemy import text

migrations = [
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name='water_goal'",
        "sql": "ALTER TABLE users ADD COLUMN water_goal INT DEFAULT 8",
        "label": "Add users.water_goal",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name='bio'",
        "sql": "ALTER TABLE users ADD COLUMN bio TEXT NULL",
        "label": "Add users.bio",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name='public_profile_slug'",
        "sql": "ALTER TABLE users ADD COLUMN public_profile_slug VARCHAR(120) NULL UNIQUE",
        "label": "Add users.public_profile_slug",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name='profile_visibility'",
        "sql": "ALTER TABLE users ADD COLUMN profile_visibility VARCHAR(20) DEFAULT 'public'",
        "label": "Add users.profile_visibility",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name='share_achievements'",
        "sql": "ALTER TABLE users ADD COLUMN share_achievements INT DEFAULT 1",
        "label": "Add users.share_achievements",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='meal_templates' AND column_name='template_type'",
        "sql": "ALTER TABLE meal_templates ADD COLUMN template_type VARCHAR(30) DEFAULT 'meal'",
        "label": "Add meal_templates.template_type",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='meal_templates' AND column_name='servings'",
        "sql": "ALTER TABLE meal_templates ADD COLUMN servings FLOAT DEFAULT 1",
        "label": "Add meal_templates.servings",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='food_logs' AND column_name='fiber'",
        "sql": "ALTER TABLE food_logs ADD COLUMN fiber FLOAT DEFAULT 0",
        "label": "Add food_logs.fiber",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='food_logs' AND column_name='sugar'",
        "sql": "ALTER TABLE food_logs ADD COLUMN sugar FLOAT DEFAULT 0",
        "label": "Add food_logs.sugar",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='food_logs' AND column_name='sodium'",
        "sql": "ALTER TABLE food_logs ADD COLUMN sodium FLOAT DEFAULT 0",
        "label": "Add food_logs.sodium",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='food_logs' AND column_name='vitamin_c'",
        "sql": "ALTER TABLE food_logs ADD COLUMN vitamin_c FLOAT DEFAULT 0",
        "label": "Add food_logs.vitamin_c",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='food_logs' AND column_name='vitamin_d'",
        "sql": "ALTER TABLE food_logs ADD COLUMN vitamin_d FLOAT DEFAULT 0",
        "label": "Add food_logs.vitamin_d",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='food_logs' AND column_name='vitamin_b12'",
        "sql": "ALTER TABLE food_logs ADD COLUMN vitamin_b12 FLOAT DEFAULT 0",
        "label": "Add food_logs.vitamin_b12",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='food_logs' AND column_name='iron'",
        "sql": "ALTER TABLE food_logs ADD COLUMN iron FLOAT DEFAULT 0",
        "label": "Add food_logs.iron",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='food_logs' AND column_name='calcium'",
        "sql": "ALTER TABLE food_logs ADD COLUMN calcium FLOAT DEFAULT 0",
        "label": "Add food_logs.calcium",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='food_logs' AND column_name='potassium'",
        "sql": "ALTER TABLE food_logs ADD COLUMN potassium FLOAT DEFAULT 0",
        "label": "Add food_logs.potassium",
    },
    {
        "check": "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users' AND column_name='allergens_json'",
        "sql": "ALTER TABLE users ADD COLUMN allergens_json TEXT NULL",
        "label": "Add users.allergens_json",
    },
]

Base.metadata.create_all(bind=engine)

with engine.connect() as conn:
    for m in migrations:
        (count,) = conn.execute(text(m["check"])).fetchone()
        if count == 0:
            conn.execute(text(m["sql"]))
            conn.commit()
            print(f"✅ Applied: {m['label']}")
        else:
            print(f"⏭️  Skipped (already exists): {m['label']}")

print("Migration complete.")
