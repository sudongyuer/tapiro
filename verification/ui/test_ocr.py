import unittest

from ocr import same


def line(text, x=214.2, y=345.8):
    return {'text': text, 'x': x, 'y': y, 'width': 152.4, 'height': 16.4}


class SameLineTest(unittest.TestCase):
    def test_two_endings_of_one_truncated_line_are_one_line(self):
        self.assertTrue(same(line('Residences Tower...'), line('Residences Tower….')))

    def test_different_words_in_one_place_stay_two_reads(self):
        self.assertFalse(same(line('lebin jaun'), line('lebih jauh')))

    def test_the_same_text_elsewhere_is_another_line(self):
        self.assertFalse(same(line('Sunway'), line('Sunway', y=400)))


if __name__ == '__main__':
    unittest.main()
