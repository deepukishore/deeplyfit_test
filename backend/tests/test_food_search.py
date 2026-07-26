import json
import unittest
from unittest.mock import MagicMock, patch

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


class IndianFoodSearchTests(unittest.TestCase):
    def test_common_indian_queries_have_multiple_ranked_results(self):
        expectations = {
            "dosa": ["Plain Dosa", "Masala Dosa", "Rava Dosa"],
            "paneer": ["Paneer", "Palak Paneer", "Paneer Butter Masala"],
            "biryani": ["Chicken Biryani", "Vegetable Biryani"],
            "roti": ["Chapati / Roti"],
            "bread": ["Chapati / Roti", "Whole Wheat Bread", "White Bread"],
        }

        for query, expected_names in expectations.items():
            with self.subTest(query=query):
                results = _local_food_results(query, page=1, page_size=20)["results"]
                names = [result["name"] for result in results]
                for expected_name in expected_names:
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


if __name__ == "__main__":
    unittest.main()
