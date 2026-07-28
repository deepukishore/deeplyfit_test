import unittest

from pydantic import ValidationError

from schemas import CommunityPostCreate


class CommunityPostTypeTests(unittest.TestCase):
    def test_general_post_is_the_default(self):
        post = CommunityPostCreate(content="Hello community")
        self.assertEqual(post.post_type, "general")

    def test_supported_post_types_are_accepted(self):
        for post_type in ("general", "update", "meal", "workout", "pr", "question"):
            with self.subTest(post_type=post_type):
                post = CommunityPostCreate(content="Test", post_type=post_type)
                self.assertEqual(post.post_type, post_type)

    def test_unknown_post_type_is_rejected(self):
        with self.assertRaises(ValidationError):
            CommunityPostCreate(content="Test", post_type="promotion")


if __name__ == "__main__":
    unittest.main()
