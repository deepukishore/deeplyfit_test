import re

from models import User


def slugify_text(value: str) -> str:
    text = (value or "").strip().lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text or "athlete"


def ensure_unique_public_slug(db, base_slug: str, exclude_user_id: int | None = None) -> str:
    candidate = slugify_text(base_slug)
    attempt = candidate
    index = 2

    while True:
        query = db.query(User).filter(User.public_profile_slug == attempt)
        if exclude_user_id is not None:
            query = query.filter(User.id != exclude_user_id)
        exists = query.first()
        if not exists:
            return attempt
        attempt = f"{candidate}-{index}"
        index += 1
