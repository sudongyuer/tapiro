import json
import subprocess
import tempfile
import threading
import unittest
from pathlib import Path

from heal import RETRIED, Attempt, Outcome, Scheduler, work
from latency import line, summary, timed, timeouts

A = ('Tapiro Verify', 'udid-a', 'ios')
B = ('Tapiro Verify 2', 'udid-b', 'ios')
STALL = Attempt('fail', "subprocess.TimeoutExpired: Command '['axe', 'tap']' timed out after 20 seconds", 2)
SLOW = Attempt('fail', 'command timed out after 180 s', 1)
PASS = Attempt('pass', 'PASS: shown')


class FakeReport:
    def __init__(self):
        self.attempts, self.stalls, self.outcomes = [], [], []
        self.guard = threading.Lock()

    def attempted(self, name, job, attempt):
        with self.guard:
            self.attempts.append((name, job, attempt.status))

    def stalled(self, name, job, attempt, retrying):
        with self.guard:
            self.stalls.append((name, job, retrying))

    def finished(self, outcome):
        with self.guard:
            self.outcomes.append(outcome)


def drive(devices, jobs, script):
    calls, healed = [], []
    guard = threading.Lock()

    def attempt(device, job):
        with guard:
            calls.append((device[0], job))
            return script(device[0], job, len(calls))

    report, halt = FakeReport(), threading.Event()
    scheduler = Scheduler(jobs, [d[0] for d in devices])
    threads = [threading.Thread(target=work, args=(scheduler, d, attempt, healed.append, report, halt)) for d in devices]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=10)
        assert not thread.is_alive(), 'worker did not finish'
    return calls, healed, report


class Heal(unittest.TestCase):
    def test_two_timeouts_reboot_and_retry_on_another_device(self):
        calls, healed, report = drive([A, B], ['case'], lambda name, job, n: STALL if n == 1 else PASS)
        first, second = calls[0][0], calls[1][0]
        self.assertNotEqual(first, second)
        self.assertEqual([d[0] for d in healed], [first])
        self.assertEqual(report.stalls, [(first, 'case', True)])
        [outcome] = report.outcomes
        self.assertEqual((outcome.stalled_device, outcome.retried_on, outcome.device), (first, second, second))

    def test_a_pass_on_retry_is_a_flagged_pass(self):
        _, _, report = drive([A, B], ['case'], lambda name, job, n: STALL if n == 1 else PASS)
        [outcome] = report.outcomes
        self.assertEqual(outcome.status, 'pass')
        self.assertTrue(outcome.message.endswith(RETRIED))
        self.assertEqual(outcome.first, STALL)

    def test_a_second_stall_on_the_retry_fails_naming_both(self):
        calls, healed, report = drive([A, B], ['case'], lambda name, job, n: STALL)
        self.assertEqual(len(calls), 2)
        [outcome] = report.outcomes
        self.assertEqual(outcome.status, 'fail')
        self.assertIn(A[0], outcome.message)
        self.assertIn(B[0], outcome.message)
        self.assertEqual(sorted(outcome.stalled_devices), sorted([A[0], B[0]]))
        self.assertEqual(sorted(d[0] for d in healed), sorted([A[0], B[0]]))

    def test_a_single_timeout_does_not_reboot(self):
        calls, healed, report = drive([A, B], ['case'], lambda name, job, n: SLOW)
        self.assertEqual(len(calls), 1)
        self.assertEqual(healed, [])
        [outcome] = report.outcomes
        self.assertEqual((outcome.status, outcome.retried_on, outcome.stalled_devices), ('fail', None, []))
        self.assertNotIn(RETRIED, outcome.message)

    def test_one_device_retries_on_itself_after_the_reboot(self):
        calls, healed, report = drive([A], ['case'], lambda name, job, n: STALL if n == 1 else PASS)
        self.assertEqual([c[0] for c in calls], [A[0], A[0]])
        self.assertEqual(healed, [A])
        [outcome] = report.outcomes
        self.assertEqual((outcome.status, outcome.stalled_device, outcome.retried_on), ('pass', A[0], A[0]))

    def test_a_stall_in_a_passing_run_reboots_without_a_retry(self):
        calls, healed, report = drive([A, B], ['case'], lambda name, job, n: Attempt('pass', 'PASS', 2))
        self.assertEqual(len(calls), 1)
        self.assertEqual(len(healed), 1)
        [outcome] = report.outcomes
        self.assertEqual((outcome.status, outcome.retried_on), ('pass', None))
        self.assertEqual(outcome.stalled_device, calls[0][0])

    def test_every_job_finishes_once_around_a_retry(self):
        jobs = [f'case{i}' for i in range(6)]
        seen = set()

        def script(name, job, n):
            first = job not in seen
            seen.add(job)
            return STALL if job == 'case2' and first else PASS

        calls, _, report = drive([A, B], jobs, script)
        self.assertEqual(len(calls), 7)
        self.assertEqual(sorted(o.job for o in report.outcomes), jobs)
        self.assertTrue(all(o.status == 'pass' for o in report.outcomes))


class ResultFile(unittest.TestCase):
    def test_a_retried_run_records_both_devices(self):
        from run import Report
        with tempfile.TemporaryDirectory() as tmp:
            job = ('light', 'home_one_card', None, 'zh-Hans', [], 180)
            out = Path(tmp) / 'zh-Hans' / 'light' / 'home_one_card'
            out.mkdir(parents=True)
            meta = {'sha': 'abc', 'dirty': False, 'xcode': 'Xcode 26', 'app': 'Tapiro.app',
                    'devices': {A[0]: A, B[0]: B}}
            report = Report(Path(tmp), meta, True, threading.Event())
            report.finished(Outcome(job, B[0], 'pass', f'PASS {RETRIED}', 30.0,
                                    stalled_devices=[A[0]], retried_on=B[0], first=STALL))
            result = json.loads((out / 'result.json').read_text())
            self.assertEqual((result['stalledDevice'], result['retriedOn']), (A[0], B[0]))
            self.assertEqual(result['device']['name'], B[0])
            self.assertTrue((out / 'stalled-log.txt').exists())


class Latency(unittest.TestCase):
    def test_counts_timed_out_commands(self):
        log = '\n'.join([line(0.2, 'axe describe-ui'), line(20.0, 'screenshot frame', True),
                         line(20.0, 'axe tap --id x', True),
                         "subprocess.TimeoutExpired: Command '['axe', 'tap']' timed out after 20 seconds"])
        self.assertEqual(timeouts(log), 2)

    def test_counts_an_untimed_command_that_died_on_a_timeout(self):
        log = '\n'.join([line(0.2, 'axe describe-ui'),
                         "subprocess.TimeoutExpired: Command '['xcrun', 'simctl', 'pbcopy']' timed out after 20 seconds",
                         line(60.0, 'screenshot failure', True)])
        self.assertEqual(timeouts(log), 2)

    def test_a_healthy_log_has_none(self):
        self.assertEqual(timeouts('\n'.join([line(0.2, 'axe tap'), line(0.3, 'screenshot home')])), 0)

    def test_timed_logs_latency_and_timeouts(self):
        lines = []
        timed('true', ['true'], 5, out=lines.append)
        with self.assertRaises(subprocess.TimeoutExpired):
            timed('sleep', ['sleep', '5'], 0.2, out=lines.append)
        self.assertEqual(timeouts('\n'.join(lines)), 1)
        self.assertTrue(lines[1].endswith('sleep TIMEOUT'))

    def test_summary_names_the_device_and_the_slowest_command(self):
        log = '\n'.join([line(0.2, 'axe tap'), line(21.4, 'screenshot frame', True)])
        text = summary('Tapiro Verify', log)
        self.assertIn('Tapiro Verify', text)
        self.assertIn('max 21.4 s (screenshot frame)', text)
        self.assertIn('1 timeouts', text)


if __name__ == '__main__':
    unittest.main()
