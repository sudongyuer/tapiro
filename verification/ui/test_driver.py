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


class Keys(unittest.TestCase):
    def typed(self, text, screens):
        ui = UI.__new__(UI)
        sent, reads = [], iter(screens)
        ui.axe = lambda *args, **kwargs: sent.append(args)
        ui.state = lambda: next(reads)
        ui.type(text)
        return sent

    def test_digits_on_a_pad_tap_its_keys(self):
        pad = [{'frame': {'x': 0, 'y': 0, 'width': 402, 'height': 874}}]
        sent = self.typed('80', [pad] * 4)
        self.assertEqual(sent, [('tap', '-x', '201', '-y', '728', '--post-delay', '0.5'),
                                ('tap', '-x', '201', '-y', '782', '--post-delay', '0.5')])

    def test_digits_on_the_letter_keyboard_stay_hid_keys(self):
        letters = [{'frame': {'x': 0, 'y': 0, 'width': 402, 'height': 874}}, {'AXUniqueId': 'Return'}]
        sent = self.typed('12', [letters] * 2)
        self.assertEqual(sent, [('key-sequence', '--keycodes', '30,31', '--delay', '0.08')])

    def test_backspace_on_a_pad_taps_its_delete_key(self):
        ui = UI.__new__(UI)
        sent, reads = [], iter([[{'frame': {'x': 0, 'y': 0, 'width': 402, 'height': 874}}]] * 6)
        ui.axe = lambda *args, **kwargs: sent.append(args)
        ui.state = lambda: next(reads)
        ui.backspace(2)
        self.assertEqual(sent, [('tap', '-x', '335', '-y', '782', '--post-delay', '0.5')] * 2)


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
