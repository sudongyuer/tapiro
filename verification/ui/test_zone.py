import os
import time
import unittest
from datetime import datetime, timedelta, timezone

from run import zone_at_hour


def local_hour(zone, now):
    previous = os.environ.get('TZ')
    os.environ['TZ'] = zone
    time.tzset()
    try:
        return datetime.fromtimestamp(now.timestamp()).hour
    finally:
        if previous is None:
            os.environ.pop('TZ')
        else:
            os.environ['TZ'] = previous
        time.tzset()


class ZoneAtHourTest(unittest.TestCase):
    def test_puts_the_device_at_the_hour_from_every_utc_hour(self):
        start = datetime(2026, 11, 6, 0, 30, tzinfo=timezone.utc)
        for step in range(24):
            now = start + timedelta(hours=step)
            for hours in ([9, 10], [3, 4]):
                zone = zone_at_hour(hours, now)
                self.assertIn(local_hour(zone, now), hours, f'{zone} at {now:%H:%M} UTC')
                self.assertNotEqual(zone, 'Etc/GMT-8', f'{hours} at {now:%H:%M} UTC fell on Malaysia time')

    def test_takes_the_next_hour_when_the_first_is_malaysia_time(self):
        now = datetime(2026, 11, 6, 1, 30, tzinfo=timezone.utc)
        self.assertEqual(zone_at_hour([9, 10], now), 'Etc/GMT-9')
        with self.assertRaisesRegex(ValueError, 'UTC\\+8'):
            zone_at_hour([9], now)


if __name__ == '__main__':
    unittest.main()
