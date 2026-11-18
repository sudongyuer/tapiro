import re
import subprocess

STREAK = 3
STALL_TIMEOUTS = 2


def timeout_class(message):
    axe = re.search(r"'axe', '([\w-]+)'.*timed out", message)
    if axe:
        return f'axe {axe.group(1)}'
    if 'screenshot' in message and 'timed out' in message:
        return 'screenshot'
    if 'command timed out' in message:
        return 'command'
    return None


def tripped(results, streak=STREAK):
    tail = results[-streak:]
    if len(tail) < streak:
        return None
    classes = {timeout_class(r['message']) if r['status'] == 'fail' else None for r in tail}
    return classes.pop() if len(classes) == 1 else None


def stalled(timeouts, threshold=STALL_TIMEOUTS):
    return timeouts >= threshold


def render_cpu_sample():
    try:
        out = subprocess.run(['top', '-l', '2', '-s', '1', '-o', 'cpu', '-n', '20', '-stats', 'pid,cpu,command'],
                             capture_output=True, text=True, timeout=20).stdout
    except subprocess.TimeoutExpired:
        return 'top timed out'
    last = out.split('PID')[-1]
    rows = [line for line in last.splitlines() if 'SimRenderServer' in line or 'SimRenderingServices' in line]
    return '\n'.join(rows) or 'SimRenderServer and SimRenderingServices are not among the 20 busiest processes'
