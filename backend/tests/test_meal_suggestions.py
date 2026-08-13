from types import SimpleNamespace

from ai.meal_suggestions import _heuristic_suggestions


def _user():
    return SimpleNamespace(
        calorie_target=2200,
        protein_target=180,
        carbs_target=230,
        fat_target=70,
    )


def _summary():
    return {
        "calories_consumed": 900,
        "protein": 54,
        "carbs": 119,
        "fat": 28,
    }


def test_refresh_excludes_the_current_meals():
    first = _heuristic_suggestions(_user(), _summary())
    first_names = {item["name"] for item in first["suggestions"]}

    refreshed = _heuristic_suggestions(
        _user(),
        _summary(),
        variant=1,
        exclude_names=list(first_names),
    )
    refreshed_names = {item["name"] for item in refreshed["suggestions"]}

    assert len(refreshed_names) == 3
    assert first_names.isdisjoint(refreshed_names)


def test_variant_rotates_relevant_meals_without_exclusions():
    first = _heuristic_suggestions(_user(), _summary(), variant=0)
    refreshed = _heuristic_suggestions(_user(), _summary(), variant=1)

    assert [item["name"] for item in first["suggestions"]] != [
        item["name"] for item in refreshed["suggestions"]
    ]


def test_suggestions_always_include_veg_and_non_veg_common_meals():
    for variant in range(4):
        result = _heuristic_suggestions(_user(), _summary(), variant=variant)
        diet_types = {item["diet_type"] for item in result["suggestions"]}

        assert len(result["suggestions"]) == 3
        assert diet_types == {"vegetarian", "non_vegetarian"}
        assert "vegetarian and non-vegetarian" in result["summary_text"]
