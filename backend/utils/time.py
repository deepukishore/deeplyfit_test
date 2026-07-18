from datetime import datetime, timezone
from typing import Optional


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def as_utc(value: Optional[datetime]) -> Optional[datetime]:
    if value is None:
        return None
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def is_past(value: datetime, now: Optional[datetime] = None) -> bool:
    normalized_value = as_utc(value)
    normalized_now = as_utc(now) if now is not None else utc_now()
    return normalized_value < normalized_now
