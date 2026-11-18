import unittest

from hourcycle import hour_cycle_commands

UDID = 'A5CC377F-F7C4-4AC8-9AE2-269111818C19'


def cycle(args):
    return {command[7]: command[9] for command in hour_cycle_commands(UDID, args)}


class HourCycleTest(unittest.TestCase):
    def test_writes_the_global_domain_of_the_given_simulator(self):
        for command in hour_cycle_commands(UDID, []):
            self.assertEqual(command[:7], ['xcrun', 'simctl', 'spawn', UDID, 'defaults', 'write', '-g'])

    def test_a_case_gets_24_hours_by_default(self):
        self.assertEqual(cycle(['-uiVerifySignedIn', 'onboarded']),
                         {'AppleICUForce24HourTime': 'true', 'AppleICUForce12HourTime': 'false'})

    def test_a_case_that_names_12_hours_gets_12(self):
        self.assertEqual(cycle(['-uiVerifySignedIn', 'onboarded', '-AppleICUForce12HourTime', 'YES']),
                         {'AppleICUForce24HourTime': 'false', 'AppleICUForce12HourTime': 'true'})


if __name__ == '__main__':
    unittest.main()
