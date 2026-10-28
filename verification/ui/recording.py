import json
import os
import signal
import subprocess
import sys
import time
from contextlib import contextmanager

from swifttool import run

STARTED = 'Recording started'


def recorder_pids(udid):
    found = subprocess.run(['pgrep', '-f', f'simctl io {udid} recordVideo'], capture_output=True, text=True)
    return [int(pid) for pid in found.stdout.split()]


def _signal(pids, sig):
    for pid in pids:
        try:
            os.kill(pid, sig)
        except ProcessLookupError:
            pass


def stop_all(udid, timeout=30):
    _signal(recorder_pids(udid), signal.SIGINT)
    deadline = time.monotonic() + timeout
    while recorder_pids(udid):
        if time.monotonic() > deadline:
            stuck = recorder_pids(udid)
            _signal(stuck, signal.SIGKILL)
            raise AssertionError(f'recordVideo for {udid} did not stop within {timeout} s; killed {stuck}')
        time.sleep(0.2)


def start(udid, path, timeout=20):
    proc = subprocess.Popen(['xcrun', 'simctl', 'io', udid, 'recordVideo', '--codec=hevc', '--force', str(path)],
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    deadline = time.monotonic() + timeout
    seen = []
    while time.monotonic() < deadline:
        line = proc.stdout.readline()
        if not line and proc.poll() is not None:
            break
        seen.append(line)
        if STARTED in line:
            return proc
    proc.kill()
    raise AssertionError(f'recordVideo to {path.name} did not start: {"".join(seen)!r}')


@contextmanager
def clip(ui, name):
    stop_all(ui.udid)
    path = ui.output / f'{name}.mp4'
    proc = start(ui.udid, path)
    try:
        yield path
    finally:
        failure = sys.exc_info()[1]
        problems = []
        proc.send_signal(signal.SIGINT)
        try:
            proc.wait(timeout=30)
        except subprocess.TimeoutExpired:
            proc.kill()
            problems.append(f'the {path.name} recorder did not stop')
        ui.segments = getattr(ui, 'segments', 1) + 1
        try:
            start(ui.udid, ui.output / f'run-{ui.segments}.mp4')
        except AssertionError as error:
            problems.append(str(error))
        if problems and failure is None:
            raise AssertionError('; '.join(problems))


def frames(video, out_dir, min_gap_s=0.03):
    return [(entry['path'], entry['t']) for entry in json.loads(run('frames', video, out_dir, min_gap_s, timeout=300))]
