import contextlib
import io
import json
import subprocess
import tempfile
import threading
import unittest
from pathlib import Path

from heal import FLAKY, RETRIED, Attempt, Outcome, Scheduler, summarize, work
from latency import line, summary, timed, timeouts

A = ('Tapiro Verify', 'udid-a', 'ios')
B = ('Tapiro Verify 2', 'udid-b', 'ios')
STALL = Attempt('fail', "subprocess.TimeoutExpired: Command '['axe', 'tap']' timed out after 20 seconds", 2)
SLOW = Attempt('fail', 'command timed out after 180 s', 1)
LOST = Attempt('fail', 'driver.AxeError: axe describe-ui failed: Error: Timed out creating the simulator remote automation '
                       'session')
PASS = Attempt('pass', 'PASS: shown')


FAILED = Attempt('fail', "AssertionError: 'sheet-dismiss' still shown after 10 s")


class FakeReport:
    def __init__(self):
        self.attempts, self.reboots, self.outcomes = [], [], []
        self.guard = threading.Lock()

    def attempted(self, name, job, attempt):
        with self.guard:
            self.attempts.append((name, job, attempt.status))

    def rebooting(self, name, job, attempt, retrying):
        with self.guard:
            self.reboots.append((name, job, retrying))

    def finished(self, outcome):
        with self.guard:
            self.outcomes.append(outcome)


def drive(devices, jobs, script, halt=None):
    calls, healed = [], []
    guard = threading.Lock()

    def attempt(device, job, retry):
        with guard:
            calls.append((device[0], job, retry))
            return script(device[0], job, len(calls))

    report, halt = FakeReport(), halt or threading.Event()
    scheduler = Scheduler(jobs, [d[0] for d in devices])
    threads = [threading.Thread(target=work, args=(scheduler, d, attempt, healed.append, report, halt)) for d in devices]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join(timeout=10)
        assert not thread.is_alive(), 'worker did not finish'
    report.outcomes += scheduler.unretried()
    return calls, healed, report


def first_fails(failure):
    return lambda name, job, n: failure if n == 1 else PASS


class Heal(unittest.TestCase):
    def test_a_failed_run_reboots_and_retries_on_another_device(self):
        calls, healed, report = drive([A, B], ['case'], first_fails(FAILED))
        (first, _, retry1), (second, _, retry2) = calls
        self.assertNotEqual(first, second)
        self.assertEqual((retry1, retry2), (False, True))
        self.assertEqual([d[0] for d in healed], [first])
        self.assertEqual(report.reboots, [(first, 'case', True)])
        [outcome] = report.outcomes
        self.assertEqual((outcome.status, outcome.first_device, outcome.retried_on, outcome.device),
                         (FLAKY, first, second, second))
        self.assertEqual(outcome.stalled_devices, [])

    def test_a_stall_reboots_and_retries_on_another_device(self):
        calls, healed, report = drive([A, B], ['case'], first_fails(STALL))
        first, second = calls[0][0], calls[1][0]
        self.assertNotEqual(first, second)
        self.assertEqual([d[0] for d in healed], [first])
        [outcome] = report.outcomes
        self.assertEqual((outcome.status, outcome.stalled_devices, outcome.retried_on), (FLAKY, [first], second))

    def test_a_lost_automation_session_reboots_and_retries_on_another_device(self):
        calls, healed, report = drive([A, B], ['case'], first_fails(LOST))
        first, second = calls[0][0], calls[1][0]
        self.assertNotEqual(first, second)
        self.assertEqual([d[0] for d in healed], [first])
        [outcome] = report.outcomes
        self.assertEqual((outcome.status, outcome.stalled_devices, outcome.retried_on), (FLAKY, [first], second))
        self.assertEqual(LOST.stall_reason, 'lost the AXe automation session')

    def test_a_single_timeout_failure_also_retries(self):
        calls, healed, report = drive([A, B], ['case'], first_fails(SLOW))
        self.assertEqual(len(calls), 2)
        self.assertEqual(len(healed), 1)
        [outcome] = report.outcomes
        self.assertEqual(outcome.status, FLAKY)

    def test_a_pass_on_retry_is_flaky_and_keeps_the_first_failure(self):
        calls, _, report = drive([A, B], ['case'], first_fails(FAILED))
        [outcome] = report.outcomes
        self.assertEqual(outcome.status, FLAKY)
        self.assertIn(RETRIED.format(device=calls[0][0]), outcome.message)
        self.assertIn(FAILED.message, outcome.message)
        self.assertEqual(outcome.first, FAILED)

    def test_a_pass_is_not_retried_and_does_not_reboot(self):
        calls, healed, report = drive([A, B], ['case'], lambda name, job, n: PASS)
        self.assertEqual(len(calls), 1)
        self.assertEqual((healed, report.reboots), ([], []))
        [outcome] = report.outcomes
        self.assertEqual((outcome.status, outcome.retried_on, outcome.first), ('pass', None, None))

    def test_a_second_failure_fails_naming_both_devices(self):
        calls, healed, report = drive([A, B], ['case'], lambda name, job, n: FAILED)
        self.assertEqual(len(calls), 2)
        [outcome] = report.outcomes
        self.assertEqual(outcome.status, 'fail')
        self.assertIn(A[0], outcome.message)
        self.assertIn(B[0], outcome.message)
        self.assertEqual(outcome.first, FAILED)
        self.assertEqual(sorted(d[0] for d in healed), sorted([A[0], B[0]]))
        self.assertEqual([r[2] for r in report.reboots], [True, False])

    def test_a_retry_that_passes_with_a_stall_is_flaky_and_names_both(self):
        _, healed, report = drive([A, B], ['case'], lambda name, job, n: STALL if n == 1 else Attempt('pass', 'PASS', 2))
        [outcome] = report.outcomes
        self.assertEqual(outcome.status, FLAKY)
        self.assertEqual(sorted(outcome.stalled_devices), sorted([A[0], B[0]]))
        self.assertEqual(len(healed), 2)

    def test_a_second_stall_fails_naming_both(self):
        _, _, report = drive([A, B], ['case'], lambda name, job, n: STALL)
        [outcome] = report.outcomes
        self.assertEqual(outcome.status, 'fail')
        self.assertEqual(sorted(outcome.stalled_devices), sorted([A[0], B[0]]))

    def test_one_device_retries_on_itself_after_the_reboot(self):
        calls, healed, report = drive([A], ['case'], first_fails(FAILED))
        self.assertEqual([c[0] for c in calls], [A[0], A[0]])
        self.assertEqual(healed, [A])
        [outcome] = report.outcomes
        self.assertEqual((outcome.status, outcome.first_device, outcome.retried_on), (FLAKY, A[0], A[0]))

    def test_one_device_failing_twice_fails(self):
        calls, healed, report = drive([A], ['case'], lambda name, job, n: FAILED)
        self.assertEqual(len(calls), 2)
        self.assertEqual(healed, [A, A])
        [outcome] = report.outcomes
        self.assertEqual(outcome.status, 'fail')

    def test_a_stall_in_a_passing_run_reboots_without_a_retry(self):
        calls, healed, report = drive([A, B], ['case'], lambda name, job, n: Attempt('pass', 'PASS', 2))
        self.assertEqual(len(calls), 1)
        self.assertEqual(len(healed), 1)
        [outcome] = report.outcomes
        self.assertEqual((outcome.status, outcome.retried_on), ('pass', None))
        self.assertEqual(outcome.stalled_devices, [calls[0][0]])

    def test_every_job_finishes_once_around_retries(self):
        jobs = [f'case{i}' for i in range(6)]
        seen = set()

        def script(name, job, n):
            first = job not in seen
            seen.add(job)
            return FAILED if job in ('case1', 'case4') and first else PASS

        calls, _, report = drive([A, B, ('Tapiro Verify 3', 'udid-c', 'ios')], jobs, script)
        self.assertEqual(len(calls), 8)
        self.assertEqual(sorted(o.job for o in report.outcomes), jobs)
        self.assertEqual(sorted(o.job for o in report.outcomes if o.status == FLAKY), ['case1', 'case4'])

    def test_a_retry_left_by_a_stopped_run_is_reported_as_a_failure(self):
        halt = threading.Event()

        def script(name, job, n):
            halt.set()
            return FAILED

        calls, healed, report = drive([A, B], ['case'], script, halt)
        self.assertEqual(len(calls), 1)
        [outcome] = report.outcomes
        self.assertEqual((outcome.status, outcome.retried_on, outcome.first), ('fail', None, FAILED))
        self.assertIn('not retried', outcome.message)
        self.assertEqual(healed, [])


def timing(status, case='case'):
    return (1.0, status, 'zh-Hans', 'light', case)


class Summary(unittest.TestCase):
    def test_flaky_runs_do_not_fail_and_are_listed(self):
        failures, lines = summarize([timing('pass'), timing(FLAKY, 'chat_list')], ['Tapiro Verify (x, failed)'], None)
        self.assertEqual(failures, 0)
        self.assertTrue(any(line.startswith('flaky: 1 runs') for line in lines))
        self.assertIn('  zh-Hans light chat_list', lines)
        self.assertIn('  Tapiro Verify (x, failed)', lines)

    def test_a_failure_fails(self):
        self.assertEqual(summarize([timing('pass'), timing('fail')], [], None)[0], 1)

    def test_a_green_run_prints_nothing_extra(self):
        self.assertEqual(summarize([timing('pass')], [], None), (0, []))

    def test_a_breaker_stop_fails(self):
        failures, lines = summarize([timing('pass')], [], 'axe tap')
        self.assertEqual(failures, 1)
        self.assertTrue(lines[-1].startswith('stopped: 3 consecutive axe tap'))


JOB = ('light', 'home_one_card', None, 'zh-Hans', [], 180)


def result_for(tmp, outcome):
    from run import Report
    out = Path(tmp) / 'zh-Hans' / 'light' / 'home_one_card'
    out.mkdir(parents=True, exist_ok=True)
    meta = {'sha': 'abc', 'dirty': False, 'xcode': 'Xcode 26', 'app': 'Tapiro.app', 'devices': {A[0]: A, B[0]: B}}
    printed = io.StringIO()
    with contextlib.redirect_stdout(printed):
        Report(Path(tmp), meta, True, threading.Event()).finished(outcome)
    return json.loads((out / 'result.json').read_text()), printed.getvalue()


class ResultFile(unittest.TestCase):
    def test_a_pass_on_retry_is_labelled_flaky_with_both_attempts(self):
        with tempfile.TemporaryDirectory() as tmp:
            result, printed = result_for(tmp, Outcome(JOB, B[0], FLAKY, f'PASS {RETRIED.format(device=A[0])}', 30.0,
                                                      retried_on=B[0], first=FAILED, first_device=A[0]))
            self.assertEqual(result['status'], 'flaky')
            self.assertEqual((result['firstAttempt']['device'], result['firstAttempt']['status']), (A[0], 'fail'))
            self.assertEqual(result['firstAttempt']['message'], FAILED.message)
            self.assertEqual(result['firstAttempt']['evidence'], 'first-attempt')
            self.assertEqual((result['retriedOn'], result['device']['name']), (B[0], B[0]))
            self.assertTrue(printed.startswith('FLAKY'))

    def test_a_clean_pass_has_no_first_attempt(self):
        with tempfile.TemporaryDirectory() as tmp:
            result, printed = result_for(tmp, Outcome(JOB, A[0], 'pass', 'PASS: shown', 10.0))
            self.assertEqual((result['status'], result['firstAttempt'], result['retriedOn']), ('pass', None, None))
            self.assertTrue(printed.startswith('PASS'))

    def test_a_retry_keeps_the_first_run_files(self):
        from heal import FIRST_ATTEMPT
        from run import clear_output
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / 'case'
            clear_output(out, keep_first=False)
            for name in ('failure.png', 'run.mp4', 'log.txt'):
                (out / name).write_text(name)
            clear_output(out, keep_first=True)
            self.assertEqual(sorted(p.name for p in out.iterdir()), [FIRST_ATTEMPT])
            self.assertEqual(sorted(p.name for p in (out / FIRST_ATTEMPT).iterdir()),
                             ['failure.png', 'log.txt', 'run.mp4'])
            (out / 'run.mp4').write_text('second')
            clear_output(out, keep_first=False)
            self.assertEqual(list(out.iterdir()), [])


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
