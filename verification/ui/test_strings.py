import re
import unittest

from driver import latin_spacing


class LatinSpacing(unittest.TestCase):
    def test_spaces_a_latin_name_next_to_han_in_chinese_only(self):
        self.assertEqual(latin_spacing('zh-Hans', 'Lily帮我'), 'Lily 帮我')
        self.assertEqual(latin_spacing('zh-Hans', '小林帮我'), '小林帮我')
        self.assertEqual(latin_spacing('zh-Hans', '帮Lily'), '帮 Lily')
        self.assertEqual(latin_spacing('en', 'Lily帮我'), 'Lily帮我')


if __name__ == '__main__':
    unittest.main()
