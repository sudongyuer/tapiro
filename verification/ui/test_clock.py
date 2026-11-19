import os
import re
import unittest
from unittest import mock

from hourcycle import clock, clock_at


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

    def test_a_set_time_reads_in_the_run_cycle(self):
        with mock.patch.dict(os.environ, {'TAPIRO_VERIFY_ARGS': ''}):
            self.assertTrue(re.fullmatch(clock_at(9, 10, 'en'), '09:10'))
            self.assertFalse(re.fullmatch(clock_at(9, 10, 'en'), '9:10\u202fAM'))
        with mock.patch.dict(os.environ, {'TAPIRO_VERIFY_ARGS': '-AppleICUForce12HourTime YES'}):
            self.assertTrue(re.fullmatch(clock_at(9, 10, 'zh-Hans'), '上午9:10'))
            self.assertTrue(re.fullmatch(clock_at(6, 30, 'zh-Hans'), '早上6:30'))
            self.assertTrue(re.fullmatch(clock_at(21, 0, 'zh-Hans'), '晚上9:00'))
            self.assertTrue(re.fullmatch(clock_at(9, 10, 'en'), '9:10\u202fAM'))
            self.assertTrue(re.fullmatch(clock_at(0, 15, 'en'), '12:15 AM'))
            self.assertTrue(re.fullmatch(clock_at(21, 0, 'ms'), '9:00 PTG'))
            self.assertFalse(re.fullmatch(clock_at(9, 10, 'en'), '9:10 PM'))
            self.assertFalse(re.fullmatch(clock_at(9, 10, 'zh-Hans'), '下午9:10'))
            self.assertFalse(re.fullmatch(clock_at(9, 10, 'en'), '09:10'))


if __name__ == '__main__':
    unittest.main()
