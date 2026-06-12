CHALLENGES = [
    {
        "id": "steps-daily",
        "name": "10K Steps Daily",
        "icon": "👟",
        "participants": 234,
        "daysLeft": 5,
    },
    {
        "id": "sugar-free-week",
        "name": "Sugar-Free Week",
        "icon": "🚫",
        "participants": 128,
        "daysLeft": 3,
    },
    {
        "id": "core-30-day",
        "name": "30-Day Core",
        "icon": "💪",
        "participants": 456,
        "daysLeft": 18,
    },
]


def get_challenge_by_id(challenge_id: str):
    for challenge in CHALLENGES:
        if challenge["id"] == challenge_id:
            return challenge
    return None
