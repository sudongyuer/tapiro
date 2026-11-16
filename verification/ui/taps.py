import json
import re
import sys
import time

RETRIES = 2
QUIET_S = 3.0
FRESH_S = 1.5
REUSE_S = 0.5
POLL_S = 0.2
TEXT_INPUTS = ('TextField', 'TextArea')
MARK = 'tap retry:'
RETRY_LINE = re.compile(rf'^{MARK} (.+?): unchanged ([\d.]+) s after tap (\d+); tapping again', re.M)
OUTCOME_LINE = re.compile(rf'^{MARK} (.+?): (changed after retry \d+|still unchanged after \d+ retries)', re.M)


def walk(node):
    if isinstance(node, dict):
        yield node
        for child in node.get('children', []):
            yield from walk(child)
    elif isinstance(node, list):
        for child in node:
            yield from walk(child)


def canonical(tree):
    return json.dumps(tree, sort_keys=True, ensure_ascii=False)


def hit(items, x, y):
    inside = [i for i in items if i.get('type') != 'Application' and (f := i.get('frame'))
              and f['x'] <= x <= f['x'] + f['width'] and f['y'] <= y <= f['y'] + f['height']]
    return min(inside, key=lambda i: i['frame']['width'] * i['frame']['height'], default=None)


def name(element):
    if not element:
        return 'nothing'
    return element.get('AXUniqueId') or repr(element.get('AXLabel') or element.get('type'))


def keyboard_up(items):
    return any(i.get('AXUniqueId') == 'Return' for i in items)


# A second tap on a focused field lands on its caret and opens the edit menu, so a field is retried only while no
# keyboard shows. A number pad lists no Return key, and moving focus between fields under it changes nothing in the
# tree (ride_settle_split, 2026-11-16), so the helpers that focus a field before typing opt out.
def checkable(element, items):
    return not (element and element.get('type') in TEXT_INPUTS and keyboard_up(items))


def baseline(ui, clock):
    seen = getattr(ui, 'tree', None)
    if seen and clock() - seen[0] <= FRESH_S:
        return seen
    return ui.snapshot()


def quiet(ui, before, clock, sleep):
    started = clock()
    while True:
        after = ui.snapshot()
        if after is None or after[1] != before[1]:
            ui.reuse = after
            return None
        waited = clock() - started
        if waited >= QUIET_S:
            return waited
        sleep(POLL_S)


def log(text):
    print(f'{MARK} {text}', file=sys.stderr, flush=True)


# A tap is sent again only when the whole accessibility tree is unchanged after it: on a Simulator that has run a while
# some taps reach nothing (status 0e/0f, 2026-11-13 to 11-16). Any change, expected or not, ends the check, so a wrong
# reaction still fails the case's own assertions.
def tap_checked(ui, target, send, locate=None, expect_change=True, clock=time.monotonic, sleep=time.sleep, out=log):
    before = baseline(ui, clock) if expect_change else None
    send()
    if before is None:
        return
    element = locate(before[2]) if locate else None
    if not checkable(element, before[2]):
        return
    label = target(before[2]) if callable(target) else target
    first = clock()
    for attempt in range(1, RETRIES + 2):
        waited = quiet(ui, before, clock, sleep)
        if waited is None:
            if attempt > 1:
                out(f'{label}: changed after retry {attempt - 1} ({clock() - first:.1f} s after the first tap)')
            return
        if attempt > RETRIES:
            out(f'{label}: still unchanged after {RETRIES} retries ({clock() - first:.1f} s); the case goes on')
            return
        out(f'{label}: unchanged {waited:.1f} s after tap {attempt}; tapping again (retry {attempt} of {RETRIES})')
        try:
            send()
        except RuntimeError:
            if quiet_now(ui, before):
                raise
            out(f'{label}: changed before retry {attempt} could land')
            return


def quiet_now(ui, before):
    after = ui.snapshot()
    return after is not None and after[1] == before[1]


def retries(log_text):
    sent = [m.group(1) for m in RETRY_LINE.finditer(log_text)]
    outcomes = {}
    for m in OUTCOME_LINE.finditer(log_text):
        outcomes.setdefault(m.group(1), []).append(m.group(2))
    lines = []
    for target in dict.fromkeys(sent):
        ended = '; '.join(outcomes.get(target, [])) or 'no outcome logged'
        lines.append(f'{target} x{sent.count(target)} ({ended})')
    return len(sent), lines
