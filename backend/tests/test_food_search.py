import json
import unittest
from unittest.mock import MagicMock, patch
from urllib.error import HTTPError

from utils.open_food_facts import (
    _local_food_results,
    _preferred_english_name,
    search_foods,
)


def mock_open_food_facts_response(products, count=None):
    response = MagicMock()
    response.read.return_value = json.dumps({
        "count": len(products) if count is None else count,
        "products": products,
    }).encode("utf-8")
    context = MagicMock()
    context.__enter__.return_value = response
    context.__exit__.return_value = False
    return context


def mock_full_text_search_response(products, count=None):
    response = MagicMock()
    response.read.return_value = json.dumps({
        "count": len(products) if count is None else count,
        "hits": products,
    }).encode("utf-8")
    context = MagicMock()
    context.__enter__.return_value = response
    context.__exit__.return_value = False
    return context


class IndianFoodSearchTests(unittest.TestCase):
    def test_common_indian_queries_have_multiple_ranked_results(self):
        expectations = {
            "dosa": ["Plain Dosa", "Masala Dosa", "Rava Dosa"],
            "paneer": ["Paneer", "Palak Paneer", "Paneer Butter Masala"],
            "biryani": ["Chicken Biryani", "Vegetable Biryani"],
            "roti": ["Chapati / Roti"],
            "bread": ["Chapati / Roti", "Whole Wheat Bread", "White Bread"],
            "omlette": ["Plain Omelette", "Masala Omelette", "Cheese Omelette"],
        }

        for query, expected_names in expectations.items():
            with self.subTest(query=query):
                results = _local_food_results(query, page=1, page_size=20)["results"]
                names = [result["name"] for result in results]
                for expected_name in expected_names:
                    self.assertIn(expected_name, names)

    def test_small_spelling_errors_still_find_indian_foods(self):
        expectations = {
            "briyani": "Chicken Biryani",
            "paner": "Paneer",
            "omellete": "Plain Omelette",
            "pesaratu": "Pesarattu",
            "idiappam": "Idiyappam",
        }

        for query, expected_name in expectations.items():
            with self.subTest(query=query):
                names = [
                    result["name"]
                    for result in _local_food_results(query, page=1, page_size=20)["results"]
                ]
                self.assertIn(expected_name, names)

    def test_south_indian_sides_and_diet_queries_are_discoverable(self):
        expectations = {
            "side dish": ["Vegetable Kurma", "Coconut Chutney", "Rasam", "South Indian Fish Fry"],
            "vegetarian": ["Rava Idli", "Pesarattu", "Vegetable Poriyal", "Coconut Chutney"],
            "non veg": ["Egg Roast", "Chicken Chettinad", "Kerala Fish Curry"],
            "south indian": ["Rava Idli", "Bisi Bele Bath", "Rasam", "Chicken Chettinad"],
        }

        for query, expected_names in expectations.items():
            with self.subTest(query=query):
                names = [
                    result["name"]
                    for result in _local_food_results(query, page=1, page_size=100)["results"]
                ]
                for expected_name in expected_names:
                    self.assertIn(expected_name, names)

    def test_chutney_and_sambar_searches_show_multiple_varieties(self):
        chutney_names = [
            result["name"]
            for result in _local_food_results("chutney", page=1, page_size=12)["results"]
        ]
        sambar_names = [
            result["name"]
            for result in _local_food_results("sambar", page=1, page_size=12)["results"]
        ]

        self.assertEqual(len(chutney_names), 12)
        self.assertIn("Coconut Chutney", chutney_names)
        self.assertIn("Ginger Chutney", chutney_names)
        self.assertIn("Roasted Gram Chutney", chutney_names)
        self.assertIn("Ridge Gourd Chutney", chutney_names)
        self.assertIn("Tiffin Sambar", sambar_names)
        self.assertIn("Drumstick Sambar", sambar_names)
        self.assertIn("Arachuvitta Sambar", sambar_names)
        self.assertIn("Keerai Sambar", sambar_names)

    @patch("utils.open_food_facts.urlopen")
    def test_chicken_fried_rice_returns_related_local_suggestions_during_outage(self, urlopen_mock):
        results = search_foods("chicken fried rice", page=1, page_size=12)["results"]
        names = [result["name"] for result in results]

        self.assertEqual(names[0], "Chicken Fried Rice")
        self.assertIn("Schezwan Chicken Fried Rice", names)
        self.assertIn("Egg Fried Rice", names)
        self.assertIn("Vegetable Fried Rice", names)
        self.assertIn("Prawn Fried Rice", names)
        urlopen_mock.assert_not_called()

    def test_regional_side_dish_aliases_find_the_expected_food(self):
        expectations = {
            "allam pachadi": "Ginger Chutney",
            "pottukadalai chutney": "Roasted Gram Chutney",
            "vankaya pachadi": "Brinjal Chutney",
            "murungakkai sambar": "Drumstick Sambar",
            "karivepaku pachadi": "Curry Leaf Chutney",
        }

        for query, expected_name in expectations.items():
            with self.subTest(query=query):
                names = [
                    result["name"]
                    for result in _local_food_results(query, page=1, page_size=12)["results"]
                ]
                self.assertIn(expected_name, names)

    def test_explicit_english_name_is_preferred(self):
        product = {
            "product_name": "Pain de mie complet",
            "product_name_en": "Whole wheat sandwich bread",
            "lang": "fr",
        }
        self.assertEqual(
            _preferred_english_name(product),
            "Whole wheat sandwich bread",
        )

    @patch("utils.open_food_facts.urlopen")
    def test_local_indian_results_are_returned_without_external_delay(self, urlopen_mock):
        urlopen_mock.return_value = mock_open_food_facts_response([
            {
                "code": "123",
                "product_name": "Packaged bread",
                "lang": "en",
                "brands": "Example",
                "nutriments": {"energy-kcal_100g": 250},
            },
        ])

        result = search_foods("bread", page=1, page_size=12)
        names = [item["name"] for item in result["results"]]

        self.assertEqual(names[0], "Chapati / Roti")
        self.assertIn("Whole Wheat Bread", names)
        self.assertNotIn("Packaged bread", names)
        urlopen_mock.assert_not_called()

    @patch("utils.open_food_facts.urlopen")
    def test_non_english_external_names_are_filtered_out(self, urlopen_mock):
        urlopen_mock.return_value = mock_open_food_facts_response([
            {
                "code": "fr-1",
                "product_name": "Céréales complètes",
                "lang": "fr",
                "nutriments": {"energy-kcal_100g": 360},
            },
            {
                "code": "en-1",
                "product_name": "Whole grain cereal",
                "lang": "en",
                "nutriments": {"energy-kcal_100g": 350},
            },
        ])

        result = search_foods("cereal", page=1, page_size=12)
        names = [item["name"] for item in result["results"]]

        self.assertEqual(names, ["Whole grain cereal"])
        requested_url = urlopen_mock.call_args.args[0].full_url
        self.assertIn("tag_0=india", requested_url)
        self.assertIn("lc=en", requested_url)

    @patch("utils.open_food_facts.urlopen")
    def test_full_text_search_is_used_for_non_local_queries(self, urlopen_mock):
        urlopen_mock.return_value = mock_full_text_search_response([
            {
                "code": "global-1",
                "product_name": "Poulet et riz",
                "product_name_en": "Blueberry cereal clusters",
                "lang": "fr",
                "brands": ["Example Foods", "Kitchen Range"],
                "nutriments": {
                    "energy-kcal_100g": 172,
                    "proteins_100g": 9,
                    "carbohydrates_100g": 24,
                    "fat_100g": 5,
                },
            },
            {
                "code": "missing-nutrition",
                "product_name_en": "Blueberry cereal without nutrition",
                "lang": "en",
                "nutriments": {},
            },
            {
                "code": "unrelated",
                "product_name_en": "Tomato soup",
                "lang": "en",
                "nutriments": {"energy-kcal_100g": 60},
            },
        ])

        result = search_foods("blueberry cereal clusters", page=1, page_size=12)

        self.assertEqual(len(result["results"]), 1)
        self.assertEqual(result["results"][0]["name"], "Blueberry cereal clusters")
        self.assertEqual(result["results"][0]["brand"], "Example Foods, Kitchen Range")
        requested_url = urlopen_mock.call_args.args[0].full_url
        self.assertTrue(requested_url.startswith("https://search.openfoodfacts.org/search?"))
        self.assertIn("boost_phrase=true", requested_url)

    @patch("utils.open_food_facts.urlopen")
    def test_legacy_search_is_used_when_full_text_service_is_busy(self, urlopen_mock):
        busy_error = HTTPError("https://search.openfoodfacts.org/search", 503, "busy", {}, None)
        urlopen_mock.side_effect = [
            busy_error,
            mock_open_food_facts_response([
                {
                    "code": "legacy-1",
                    "product_name": "Cocoa cereal clusters",
                    "lang": "en",
                    "brands": "Example",
                    "nutriments": {"energy-kcal_100g": 350},
                },
            ]),
        ]

        result = search_foods("cocoa cereal clusters", page=1, page_size=12)

        self.assertEqual([item["name"] for item in result["results"]], ["Cocoa cereal clusters"])
        self.assertEqual(urlopen_mock.call_count, 2)
        legacy_url = urlopen_mock.call_args.args[0].full_url
        self.assertTrue(legacy_url.startswith("https://world.openfoodfacts.org/cgi/search.pl?"))


if __name__ == "__main__":
    unittest.main()
