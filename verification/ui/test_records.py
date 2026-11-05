import unittest
from pathlib import Path

from records import RECORD_KEYS, app_record_keys, reset_commands

UDID = 'A5CC377F-F7C4-4AC8-9AE2-269111818C19'
PLIST = Path('/data/Containers/Data/Application/X/Library/Preferences/app.tapiro.plist')
SRC = Path(__file__).resolve().parents[2] / 'src'


class RecordResetTest(unittest.TestCase):
    def test_every_command_deletes_one_key_from_the_app_container_plist_on_the_given_simulator(self):
        commands = reset_commands(UDID, PLIST)
        for command in commands:
            self.assertEqual(command[:7], ['xcrun', 'simctl', 'spawn', UDID, 'defaults', 'delete', str(PLIST)])
        self.assertEqual([command[7] for command in commands], list(RECORD_KEYS))

    def test_clears_the_chat_call_log_that_went_stale(self):
        self.assertIn('uiVerifyChatCalls', [command[7] for command in reset_commands(UDID, PLIST)])

    def test_covers_every_record_the_app_writes_in_verify_mode(self):
        self.assertEqual(set(RECORD_KEYS), app_record_keys(SRC))


if __name__ == '__main__':
    unittest.main()
