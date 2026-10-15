import unittest

from breaker import timeout_class, tripped


def fail(message):
    return {'status': 'fail', 'message': message}


PASS = {'status': 'pass', 'message': ''}
SHOT = fail('command timed out after 180 s; failure screenshot timed out after 60 s')
TAP = fail("subprocess.TimeoutExpired: Command '['axe', 'tap', '--id', 'x']' timed out after 20 seconds")


class Breaker(unittest.TestCase):
    def test_classes(self):
        self.assertEqual(timeout_class(TAP['message']), 'axe tap')
        self.assertEqual(timeout_class(SHOT['message']), 'screenshot')
        self.assertEqual(timeout_class('command timed out after 180 s'), 'command')
        self.assertIsNone(timeout_class('panel moved after settling'))

    def test_three_in_a_row_trip(self):
        self.assertEqual(tripped([PASS, TAP, TAP, TAP]), 'axe tap')

    def test_two_do_not(self):
        self.assertIsNone(tripped([TAP, TAP]))

    def test_mixed_classes_do_not(self):
        self.assertIsNone(tripped([TAP, SHOT, TAP]))

    def test_ordinary_failures_do_not(self):
        self.assertIsNone(tripped([fail('x'), fail('x'), fail('x')]))

    def test_a_pass_resets(self):
        self.assertIsNone(tripped([TAP, TAP, PASS]))


if __name__ == '__main__':
    unittest.main()
