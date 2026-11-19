import os
import re
import unittest
from unittest import mock

from driver import clock


class ClockTest(unittest.TestCase):
    def test_a_24_hour_run_reads_two_digit_hours(self):
        with mock.patch.dict(os.environ, {'TAPIRO_VERIFY_ARGS': '-uiVerifySignedIn onboarded'}):
            self.assertTrue(re.fullmatch(clock('en'), '21:00'))
            self.assertFalse(re.fullmatch(clock('en'), '9:00 PM'))

    def test_a_12_hour_run_reads_each_locale_as_ios_writes_it(self):
        with mock.patch.dict(os.environ, {'TAPIRO_VERIFY_ARGS': '-AppleICUForce12HourTime YES'}):
            self.assertTrue(re.fullmatch(clock('zh-Hans'), '上午8:47'))
            self.assertTrue(re.fullmatch(clock('en'), '9:00 PM'))
            self.assertTrue(re.fullmatch(clock('ms'), '9:00 PTG'))
            self.assertFalse(re.fullmatch(clock('en'), '21:00'))


if __name__ == '__main__':
    unittest.main()
