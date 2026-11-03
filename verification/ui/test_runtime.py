import unittest

from run import DEVICE_TYPE, newest_runtime


def runtime(identifier, *device_types):
    return {'identifier': identifier, 'platform': 'iOS',
            'supportedDeviceTypes': [{'identifier': d} for d in device_types]}


class NewestRuntimeTest(unittest.TestCase):
    def test_skips_a_device_specific_runtime_listed_last(self):
        runtimes = [
            runtime('iOS-26-5', DEVICE_TYPE),
            runtime('iOS-27-2', DEVICE_TYPE),
            runtime('iOS-27-2-iPhone19-4', 'com.apple.CoreSimulator.SimDeviceType.iPhone-Duo'),
        ]
        self.assertEqual(newest_runtime(runtimes), 'iOS-27-2')

    def test_ignores_other_platforms(self):
        watch = {**runtime('watchOS-27-0', DEVICE_TYPE), 'platform': 'watchOS'}
        self.assertEqual(newest_runtime([runtime('iOS-26-5', DEVICE_TYPE), watch]), 'iOS-26-5')

    def test_fails_when_no_runtime_fits(self):
        with self.assertRaises(SystemExit):
            newest_runtime([runtime('iOS-27-2-iPhone19-4', 'other')])


if __name__ == '__main__':
    unittest.main()
