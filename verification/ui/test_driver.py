import unittest

from driver import UI, assert_touch_target


def element(width, height):
    return {'frame': {'x': 0, 'y': 0, 'width': width, 'height': height}}


class TouchTarget(unittest.TestCase):
    def test_float_noise_around_44_passes(self):
        assert_touch_target(element(370, 43.999969482421875), 'row')
        assert_touch_target(element(44.00000762939453, 44), 'row')

    def test_one_pixel_short_fails(self):
        with self.assertRaisesRegex(AssertionError, '44 pt target'):
            assert_touch_target(element(370, 43.666666666666686), 'row')
        with self.assertRaisesRegex(AssertionError, '44 pt target'):
            assert_touch_target(element(13, 15.67), '改')


class Typing(unittest.TestCase):
    def test_non_ascii_text_is_refused_before_axe_runs(self):
        ui = UI.__new__(UI)
        ui.axe = lambda *args, **kwargs: self.fail('axe ran')
        with self.assertRaisesRegex(AssertionError, 'paste_into'):
            ui.type('我中途下车了')


if __name__ == '__main__':
    unittest.main()
