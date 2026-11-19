import os
import shutil
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest import mock

import run

FAKE_XCRUN = r'''#!/bin/bash
S="$FAKE_SIM_STATE"
echo "$*" >> "$S/calls"
[ "$1" = simctl ] || exit 0
case "$2" in
  shutdown) [ -f "$S/stuck" ] || rm -f "$S/busy" ;;
  get_app_container) exit 1 ;;
  io)
    out="${@: -1}"
    if [ "$4" = screenshot ]; then printf png > "$out"; exit 0; fi
    if [ -f "$S/busy" ]; then
      echo 'Error starting video recorder: Error Domain=NSPOSIXErrorDomain Code=16 "Resource busy" UserInfo={NSLocalizedFailureReason=A recording is already in progress}.'
      exit 16
    fi
    trap 'printf mp4 > "$out"; echo "Wrote video to: $out"; exit 0' INT
    echo 'Recording started'
    while :; do sleep 0.05; done ;;
esac
exit 0
'''

PASSING_CASE = '''import sys
from pathlib import Path
Path(sys.argv[2], '01-shown.png').write_bytes(b'png')
print('PASS: shown')
'''


class RecorderBusyTest(unittest.TestCase):
    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, True)
        self.state = self.tmp / 'state'
        self.state.mkdir()
        bin_dir = self.tmp / 'bin'
        bin_dir.mkdir()
        xcrun = bin_dir / 'xcrun'
        xcrun.write_text(FAKE_XCRUN)
        xcrun.chmod(0o755)
        (self.tmp / 'cases').mkdir()
        (self.tmp / 'cases' / 'shown.py').write_text(PASSING_CASE)
        patched = {'PATH': f'{bin_dir}:{os.environ["PATH"]}', 'FAKE_SIM_STATE': str(self.state)}
        for patch in (mock.patch.dict(os.environ, patched), mock.patch.object(run, 'HERE', self.tmp)):
            patch.start()
            self.addCleanup(patch.stop)
        self.device = ('Fake Verify', f'FAKE-{uuid.uuid4()}', 'ios')
        self.out = self.tmp / 'out'

    def run_case(self):
        return run.run_case('shown', None, [], 30, 'zh-Hans', 'light', self.device, self.out)

    def shutdowns(self):
        calls = (self.state / 'calls').read_text().splitlines()
        return [call for call in calls if call.startswith(f'simctl shutdown {self.device[1]}')]

    def test_a_recording_left_by_a_killed_recorder_is_freed_before_the_case(self):
        (self.state / 'busy').touch()
        attempt = self.run_case()
        self.assertEqual((attempt.status, attempt.message), ('pass', 'PASS: shown'))
        self.assertEqual((self.out / 'run.mp4').read_text(), 'mp4')
        self.assertEqual(len(self.shutdowns()), 1)
        self.assertIn('A recording is already in progress', (self.out / 'log.txt').read_text())

    def test_a_free_simulator_is_not_rebooted(self):
        attempt = self.run_case()
        self.assertEqual(attempt.status, 'pass')
        self.assertEqual(self.shutdowns(), [])

    def test_a_recording_that_stays_busy_fails_the_run_with_the_recorder_error(self):
        (self.state / 'busy').touch()
        (self.state / 'stuck').touch()
        attempt = self.run_case()
        self.assertEqual(attempt.status, 'fail')
        self.assertIn('video missing', attempt.message)
        self.assertIn('A recording is already in progress', attempt.message)
        self.assertFalse((self.out / 'run.mp4').exists())


if __name__ == '__main__':
    unittest.main()
