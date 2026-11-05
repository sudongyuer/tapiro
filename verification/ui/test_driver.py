import unittest
from types import SimpleNamespace
from unittest import mock

import driver

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


class Tapping(unittest.TestCase):
    def sent(self, *args):
        calls = []

        def fake(label, argv, timeout, **kwargs):
            calls.append(argv)
            return SimpleNamespace(returncode=0, stdout='', stderr='')

        ui = UI.__new__(UI)
        ui.udid = 'test'
        with mock.patch.object(driver, 'timed', fake):
            ui.axe(*args)
        return calls[0][1:-2]

    def test_a_raw_tap_waits_after_the_touch(self):
        self.assertEqual(self.sent('tap', '-x', '10', '-y', '20'), ['tap', '-x', '10', '-y', '20', '--post-delay', '0.5'])

    def test_an_explicit_post_delay_and_other_commands_are_kept(self):
        self.assertEqual(self.sent('tap', '--id', 'a', '--post-delay', '2'), ['tap', '--id', 'a', '--post-delay', '2'])
        self.assertEqual(self.sent('describe-ui'), ['describe-ui'])


if __name__ == '__main__':
    unittest.main()
