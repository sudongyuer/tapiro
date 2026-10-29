import unittest

from pool import DEVICE_NAME, device_names, worker_count

GB = 10 ** 9


class Pool(unittest.TestCase):
    def test_names_keep_the_first_simulator(self):
        self.assertEqual(device_names(3), [DEVICE_NAME, f'{DEVICE_NAME} 2', f'{DEVICE_NAME} 3'])

    def test_three_workers_with_room(self):
        self.assertEqual(worker_count(3, 10, 40 * GB), (3, None))

    def test_low_disk_falls_back_to_one(self):
        count, reason = worker_count(3, 10, 14.9 * GB)
        self.assertEqual(count, 1)
        self.assertIn('14.9 GB', reason)

    def test_exactly_fifteen_is_enough(self):
        self.assertEqual(worker_count(3, 10, 15 * GB), (3, None))

    def test_never_more_workers_than_runs(self):
        self.assertEqual(worker_count(3, 2, 40 * GB), (2, None))

    def test_pinned_udid_runs_alone(self):
        self.assertEqual(worker_count(3, 10, 40 * GB, pinned_udid=True), (1, None))

    def test_one_requested(self):
        self.assertEqual(worker_count(1, 10, 1 * GB), (1, None))


if __name__ == '__main__':
    unittest.main()
