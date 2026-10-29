import re
import subprocess
import sys
import time

TIMEOUT = 'TIMEOUT'
LINE = re.compile(r'^\s*([\d.]+)s (.+?)( TIMEOUT)?$', re.M)
UNCAUGHT = re.compile(r'^subprocess\.TimeoutExpired: ', re.M)


def line(seconds, label, timed_out=False):
    return f'{seconds:5.1f}s {label}' + (f' {TIMEOUT}' if timed_out else '')


def timed(label, argv, timeout, check=False, out=None, **kwargs):
    out = out if out is not None else (lambda text: print(text, file=sys.stderr, flush=True))
    started = time.monotonic()
    try:
        proc = subprocess.run(argv, capture_output=True, timeout=timeout, **kwargs)
    except subprocess.TimeoutExpired:
        out(line(time.monotonic() - started, label, timed_out=True))
        raise
    out(line(time.monotonic() - started, label))
    if check and proc.returncode != 0:
        raise subprocess.CalledProcessError(proc.returncode, argv, proc.stdout, proc.stderr)
    return proc


def calls(log):
    return [(float(m.group(1)), m.group(2), bool(m.group(3))) for m in LINE.finditer(log)]


def timeouts(log):
    found = calls(log)
    counted = sum(timed_out for _, _, timed_out in found)
    uncaught = list(UNCAUGHT.finditer(log))
    if uncaught:
        before = [m for m in LINE.finditer(log) if m.start() < uncaught[-1].start()]
        # A command run outside `timed` (a case's own subprocess call) dies with a traceback but no latency line.
        if not before or not before[-1].group(3):
            counted += 1
    return counted


def summary(device, log):
    found = calls(log)
    if not found:
        return f'latency on {device}: no timed commands'
    seconds = sorted(s for s, _, _ in found)
    slowest = max(found, key=lambda call: call[0])
    return (f'latency on {device}: {len(found)} commands, median {seconds[len(seconds) // 2]:.1f} s, '
            f'max {slowest[0]:.1f} s ({slowest[1]}), {timeouts(log)} timeouts')
