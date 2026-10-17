import re

STREAK = 3


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
