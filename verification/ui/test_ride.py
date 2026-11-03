import unittest

from ride import clock_24h


class Clock24hTest(unittest.TestCase):
    def test_reads_the_zh_hans_afternoon_marker_before_the_clock(self):
        self.assertEqual(clock_24h('下午5:00'), '17:00')
        self.assertEqual(clock_24h('2026年11月3日下午5:00'), '17:00')
        self.assertEqual(clock_24h('上午9:30'), '09:30')

    def test_reads_a_marker_after_the_clock_and_a_24_hour_clock(self):
        self.assertEqual(clock_24h('5:00 PM'), '17:00')
        self.assertEqual(clock_24h('5.00 PTG'), '17:00')
        self.assertEqual(clock_24h('17:00'), '17:00')


if __name__ == '__main__':
    unittest.main()
