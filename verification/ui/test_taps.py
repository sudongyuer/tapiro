import contextlib
import io
import json
import tempfile
import threading
import time
import unittest
from pathlib import Path
from unittest import mock

import driver
from driver import UI, Transition
from heal import Attempt, Outcome, Scheduler, settle, summarize
from taps import POLL_S, QUIET_S, RETRIES, canonical, retries, tap_checked

SCREEN = {'type': 'Group', 'frame': {'x': 0, 'y': 0, 'width': 402, 'height': 874}}
FIELD = {'type': 'TextArea', 'AXUniqueId': 'prompt', 'frame': {'x': 10, 'y': 700, 'width': 300, 'height': 40}}
RETURN = {'type': 'Button', 'AXUniqueId': 'Return', 'frame': {'x': 300, 'y': 820, 'width': 90, 'height': 40}}


def tree(*items, at=0.0):
    return (at, canonical(list(items)), list(items))


class Clock:
    def __init__(self):
        self.now = 100.0

    def __call__(self):
        return self.now

    def sleep(self, seconds):
        self.now += seconds


class FakeUI:
    def __init__(self, clock, screens, before=None):
        self.clock, self.screens, self.reads, self.sent, self.reuse = clock, list(screens), 0, [], None
        self.tree = before

    def snapshot(self):
        self.reads += 1
        self.clock.now += 1.0
        screen = self.screens.pop(0) if len(self.screens) > 1 else self.screens[0]
        self.tree = None if screen is None else (self.clock.now, screen[1], screen[2])
        return self.tree

    def send(self):
        self.sent.append(self.clock.now)
        self.tree = None


def run(screens, before=tree(SCREEN), locate=None, expect_change=True, send=None):
    clock = Clock()
    ui = FakeUI(clock, screens, before and (clock.now, before[1], before[2]))
    logged = []
    tap_checked(ui, 'target', send or ui.send, locate, expect_change, clock=clock, sleep=clock.sleep,
                out=logged.append)
    return ui, logged


class TapRetry(unittest.TestCase):
    def test_a_tap_that_changes_the_tree_is_sent_once_and_logs_nothing(self):
        ui, logged = run([tree(SCREEN, RETURN)])
        self.assertEqual((len(ui.sent), ui.reads, logged), (1, 1, []))

    def test_the_read_that_saw_the_change_is_handed_to_the_next_state_read(self):
        ui, _ = run([tree(SCREEN, RETURN)])
        self.assertEqual(ui.reuse[2], [SCREEN, RETURN])

    def test_an_unchanged_tree_is_tapped_again_and_the_retry_is_logged(self):
        ui, logged = run([tree(SCREEN)] * 4 + [tree(SCREEN, RETURN)])
        self.assertEqual(len(ui.sent), 2)
        self.assertRegex(logged[0], r'^target: unchanged [\d.]+ s after tap 1; tapping again \(retry 1 of 2\)$')
        self.assertRegex(logged[1], r'^target: changed after retry 1 \([\d.]+ s after the first tap\)$')

    def test_the_retry_waits_the_quiet_window_first(self):
        ui, _ = run([tree(SCREEN)] * 4 + [tree(SCREEN, RETURN)])
        self.assertGreaterEqual(ui.sent[1] - ui.sent[0], QUIET_S)

    def test_a_tree_that_never_changes_gets_two_retries_then_the_case_goes_on(self):
        ui, logged = run([tree(SCREEN)])
        self.assertEqual(len(ui.sent), 1 + RETRIES)
        self.assertEqual(sum('tapping again' in line for line in logged), RETRIES)
        self.assertIn(f'still unchanged after {RETRIES} retries', logged[-1])

    def test_a_different_screen_is_never_retried_even_when_unexpected(self):
        other = {'type': 'StaticText', 'AXLabel': 'Something went wrong', 'frame': SCREEN['frame']}
        ui, logged = run([tree(other)])
        self.assertEqual((len(ui.sent), logged), (1, []))

    def test_a_moved_frame_counts_as_a_change(self):
        moved = {**FIELD, 'frame': {**FIELD['frame'], 'y': 699.5}}
        ui, logged = run([tree(SCREEN, moved)], before=tree(SCREEN, FIELD))
        self.assertEqual((len(ui.sent), logged), (1, []))

    def test_a_transition_counts_as_a_change(self):
        ui, logged = run([None])
        self.assertEqual((len(ui.sent), logged), (1, []))

    def test_an_opted_out_tap_reads_nothing_and_is_never_retried(self):
        ui, logged = run([tree(SCREEN)], before=None, expect_change=False)
        self.assertEqual((len(ui.sent), ui.reads, logged), (1, 0, []))

    def test_a_field_under_a_shown_keyboard_is_not_retried(self):
        ui, logged = run([tree(SCREEN, FIELD, RETURN)], before=tree(SCREEN, FIELD, RETURN),
                         locate=lambda items: items[1])
        self.assertEqual((len(ui.sent), logged), (1, []))

    def test_a_field_without_a_keyboard_is_retried(self):
        ui, logged = run([tree(SCREEN, FIELD)] * 4 + [tree(SCREEN, FIELD, RETURN)], before=tree(SCREEN, FIELD),
                         locate=lambda items: items[1])
        self.assertEqual(len(ui.sent), 2)

    def test_a_stale_baseline_is_read_again_before_the_tap(self):
        clock = Clock()
        ui = FakeUI(clock, [tree(SCREEN), tree(SCREEN, RETURN)], (clock.now - 5, canonical([SCREEN, FIELD]), []))
        tap_checked(ui, 'target', ui.send, clock=clock, sleep=clock.sleep, out=lambda _: None)
        self.assertEqual((ui.reads, len(ui.sent)), (2, 1))

    def test_a_failed_retry_on_a_changed_screen_ends_the_check(self):
        calls = []

        def send():
            calls.append(1)
            if len(calls) > 1:
                ui.screens = [tree(SCREEN, RETURN)]
                raise driver.AxeError('axe tap --id target failed: no element')

        clock = Clock()
        ui = FakeUI(clock, [tree(SCREEN)], (clock.now, canonical([SCREEN]), [SCREEN]))
        logged = []
        tap_checked(ui, 'target', send, clock=clock, sleep=clock.sleep, out=logged.append)
        self.assertIn('changed before retry 1 could land', logged[-1])

    def test_a_failed_retry_on_an_unchanged_screen_raises(self):
        def send():
            if ui.sent:
                raise driver.AxeError('axe tap failed: Timed out creating the simulator remote automation session')
            ui.sent.append(1)

        clock = Clock()
        ui = FakeUI(clock, [tree(SCREEN)], (clock.now, canonical([SCREEN]), [SCREEN]))
        with self.assertRaises(driver.AxeError):
            tap_checked(ui, 'target', send, clock=clock, sleep=clock.sleep, out=lambda _: None)


class Canonical(unittest.TestCase):
    def test_key_order_from_describe_ui_does_not_count_as_a_change(self):
        a = json.loads('[{"type": "Group", "AXLabel": null, "frame": {"x": 0, "y": 1}}]')
        b = json.loads('[{"frame": {"y": 1, "x": 0}, "AXLabel": null, "type": "Group"}]')
        self.assertEqual(canonical(a), canonical(b))


class DriverTree(unittest.TestCase):
    def ui(self, outputs):
        ui = UI.__new__(UI)
        ui.udid, ui.tree, ui.reuse, sent = 'test', None, None, []

        def axe(*args, **kwargs):
            sent.append(args)
            if args[:1] != ('describe-ui',):
                ui.tree = ui.reuse = None
                return ''
            out = outputs.pop(0)
            if isinstance(out, Exception):
                raise out
            return out

        ui.axe = axe
        return ui, sent

    def test_state_keeps_a_canonical_tree_and_input_clears_it(self):
        ui, _ = self.ui([json.dumps([SCREEN])])
        ui.state()
        self.assertEqual(ui.tree[1], canonical([SCREEN]))
        ui.axe('swipe')
        self.assertIsNone(ui.tree)

    def test_a_fresh_reused_read_saves_one_describe_ui(self):
        ui, sent = self.ui([])
        ui.reuse = (time.monotonic(), canonical([SCREEN]), [SCREEN])
        self.assertEqual(ui.state(), [SCREEN])
        self.assertEqual(sent, [])

    def test_an_old_reused_read_is_read_again(self):
        ui, sent = self.ui([json.dumps([SCREEN, RETURN])])
        ui.reuse = (time.monotonic() - 5, canonical([SCREEN]), [SCREEN])
        self.assertEqual(len(ui.state()), 2)
        self.assertEqual(sent, [('describe-ui',)])

    def test_a_transition_snapshot_is_none(self):
        ui, _ = self.ui([Transition('No translation object returned for simulator')])
        self.assertIsNone(ui.snapshot())

    def test_the_real_axe_clears_the_tree_on_input(self):
        ui = UI.__new__(UI)
        ui.udid, ui.tree, ui.reuse = 'test', tree(SCREEN), None
        fake = mock.Mock(return_value=mock.Mock(returncode=0, stdout='', stderr=''))
        with mock.patch.object(driver, 'timed', fake):
            ui.axe('tap', '--id', 'x')
        self.assertIsNone(ui.tree)


LOG = """  1.1s axe describe-ui
tap retry: ask-tapir-prompt: unchanged 3.2 s after tap 1; tapping again (retry 1 of 2)
  2.0s axe tap --id ask-tapir-prompt --post-delay 0.5
tap retry: ask-tapir-prompt: changed after retry 1 (6.1 s after the first tap)
tap retry: (201, 400) on 'Back': unchanged 3.0 s after tap 1; tapping again (retry 1 of 2)
tap retry: (201, 400) on 'Back': unchanged 3.1 s after tap 2; tapping again (retry 2 of 2)
tap retry: (201, 400) on 'Back': still unchanged after 2 retries (14.0 s); the case goes on
"""


class Reported(unittest.TestCase):
    def test_the_log_counts_each_retry_and_names_its_outcome(self):
        count, notes = retries(LOG)
        self.assertEqual(count, 3)
        self.assertEqual(notes, ['ask-tapir-prompt x1 (changed after retry 1)',
                                 "(201, 400) on 'Back' x2 (still unchanged after 2 retries)"])

    def test_a_log_without_retries_counts_none(self):
        self.assertEqual(retries('  1.1s axe describe-ui\nPASS: shown\n'), (0, []))

    def test_a_pass_that_needed_a_retry_stays_a_pass_and_is_listed(self):
        job = ('light', 'ask_sheet_worst', None, 'zh-Hans', [], 300)
        attempt = Attempt('pass', 'PASS: shown', 0, 10.0, 1, ('ask-tapir-prompt x1 (changed after retry 1)',))
        outcome = settle(Scheduler([job], ['a']).pending[0], 'a', attempt)
        self.assertEqual((outcome.status, outcome.tap_retries), ('pass', 1))
        timing = (10.0, outcome.status, 'zh-Hans', 'light', 'ask_sheet_worst')
        failures, lines = summarize([timing], [], None, [(1, 'zh-Hans light ask_sheet_worst [pass]: x')])
        self.assertEqual(failures, 0)
        self.assertEqual(lines[0], 'tap retries: 1 in 1 runs (a tap left the accessibility tree unchanged and was '
                                   'sent again; a pass here needed it):')
        self.assertEqual(lines[1], '  zh-Hans light ask_sheet_worst [pass]: x')

    def test_the_result_file_and_the_printed_line_carry_the_retries(self):
        from run import Report
        job = ('light', 'home_one_card', None, 'zh-Hans', [], 180)
        device = ('Tapiro Verify', 'udid-a', 'ios')
        outcome = Outcome(job, device[0], 'pass', 'PASS: shown', 10.0, tap_retries=2, tap_notes=('x x2 (y)',))
        with tempfile.TemporaryDirectory() as tmp:
            out = Path(tmp) / 'zh-Hans' / 'light' / 'home_one_card'
            out.mkdir(parents=True)
            meta = {'sha': 'abc', 'dirty': False, 'xcode': 'Xcode', 'app': 'Tapiro.app', 'devices': {device[0]: device}}
            report = Report(Path(tmp), meta, False, threading.Event())
            printed = io.StringIO()
            with contextlib.redirect_stdout(printed):
                report.finished(outcome)
            result = json.loads((out / 'result.json').read_text())
        self.assertEqual(result['tapRetries'], {'count': 2, 'targets': ['x x2 (y)']})
        self.assertTrue(printed.getvalue().startswith('PASS'))
        self.assertIn('tap retries: x x2 (y)', printed.getvalue())
        self.assertEqual(report.tapped, [(2, 'zh-Hans light home_one_card [pass]: x x2 (y)')])


if __name__ == '__main__':
    unittest.main()
