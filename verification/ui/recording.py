import json
import os
import signal
import subprocess
import time
from contextlib import contextmanager

from swifttool import run

STARTED = 'Recording started'


def recorder_pids(udid):
    found = subprocess.run(['pgrep', '-f', f'simctl io {udid} recordVideo'], capture_output=True, text=True)
    return [int(pid) for pid in found.stdout.split()]


def stop_all(udid, timeout=30):
    for pid in recorder_pids(udid):
        try:
            os.kill(pid, signal.SIGINT)
        except ProcessLookupError:
            pass
    deadline = time.monotonic() + timeout
    while recorder_pids(udid):
        if time.monotonic() > deadline:
            raise AssertionError(f'a recordVideo for {udid} did not stop within {timeout} s')
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
        proc.send_signal(signal.SIGINT)
        proc.wait(timeout=30)
        ui.segments = getattr(ui, 'segments', 1) + 1
        start(ui.udid, ui.output / f'run-{ui.segments}.mp4')


def frames(video, out_dir, min_gap_s=0.03):
    return [(entry['path'], entry['t']) for entry in json.loads(run('frames', video, out_dir, min_gap_s, timeout=300))]
