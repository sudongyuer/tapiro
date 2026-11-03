import unittest

from run import keyboard_commands

UDID = 'A5CC377F-F7C4-4AC8-9AE2-269111818C19'


def writes(domain, key):
    return [c[8:] for c in keyboard_commands(UDID) if c[5:8] == ['write', domain, key]]


class KeyboardCommandsTest(unittest.TestCase):
    def test_every_command_writes_defaults_on_the_given_simulator(self):
        for command in keyboard_commands(UDID):
            self.assertEqual(command[:6], ['xcrun', 'simctl', 'spawn', UDID, 'defaults', 'write'])

    def test_enables_only_us_english_and_emoji_so_no_input_method_composes_ascii(self):
        (value,) = writes('-g', 'AppleKeyboards')
        self.assertEqual(value, ['-array', 'en_US@sw=QWERTY;hw=Automatic', 'emoji@sw=Emoji'])
        self.assertFalse(any('Pinyin' in part for command in keyboard_commands(UDID) for part in command))

    def test_turns_off_prediction_and_autocorrection_but_keeps_autocapitalisation(self):
        self.assertEqual(writes('com.apple.keyboard.preferences', 'KeyboardPrediction'), [['-bool', 'false']])
        self.assertEqual(writes('com.apple.keyboard.preferences', 'KeyboardAutocorrection'), [['-bool', 'false']])
        self.assertEqual(writes('com.apple.keyboard.preferences', 'KeyboardAutocapitalization'), [])

    def test_makes_us_english_the_current_keyboard(self):
        (value,) = writes('com.apple.keyboard.preferences', 'KeyboardsCurrentAndNext')
        self.assertEqual(value, ['-array', 'en_US@sw=QWERTY;hw=Automatic', 'en_US@sw=QWERTY;hw=Automatic'])


if __name__ == '__main__':
    unittest.main()
