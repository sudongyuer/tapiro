import json
import re
import subprocess
import tempfile
import time
from pathlib import Path

from driver import BUNDLE_ID, Shot, by_id, close, token
from recording import frames

BOUNTY = 'fixture-bounty-01'
HOLD = 'bounty-select-hold'
JIE, HANA, AIMAN = (f'fixture-applicant-{name}' for name in ('jie', 'hana', 'aiman'))
SELECTED_KEY = 'uiVerifySelectedArgs'
ATTEMPTS_KEY = 'uiVerifySelectAttempts'
FRAME_GAP_S = 0.03
COLOUR_SLACK = 30
EDGE_ROW_FROM_BOTTOM = 12
SERVICES = Path(__file__).resolve().parents[2] / 'src/features/bounty/select/services.ts'


def write_delay_s():
    found = re.search(r'VERIFY_WRITE_DELAY_MS = (\d+)', SERVICES.read_text())
    assert found, f'VERIFY_WRITE_DELAY_MS not found in {SERVICES}'
    return int(found.group(1)) / 1000


def row_id(applicant):
    return f'bounty-applicant-{applicant}'


def hold_reads(ui, expected, timeout=30):
    return ui.wait_label(HOLD, lambda text: text == expected, f'the hold button does not read {expected!r}', timeout)


def choose(ui, applicant, name):
    ui.settled(lambda items: by_id(items, row_id(applicant)), f'{applicant} row never settled')
    ui.tap(row_id(applicant))
    return hold_reads(ui, ui.t('bounty.select.hold.label', name=name))['frame']


def hold_select(ui, seconds=1.5):
    return ui.press(HOLD, seconds)


def release_early(ui, seconds=0.4):
    return ui.press(HOLD, seconds)


def defaults(ui, key):
    container = subprocess.run(['xcrun', 'simctl', 'get_app_container', ui.udid, BUNDLE_ID, 'data'],
                               capture_output=True, text=True, check=True, timeout=20).stdout.strip()
    plist = Path(container) / 'Library' / 'Preferences' / f'{BUNDLE_ID}.plist'
    proc = subprocess.run(['plutil', '-extract', key, 'raw', '-o', '-', str(plist)], capture_output=True, text=True)
    return proc.stdout.strip() if proc.returncode == 0 else ''


def selected_args(ui):
    text = defaults(ui, SELECTED_KEY)
    return json.loads(text) if text else []


def attempts(ui):
    text = defaults(ui, ATTEMPTS_KEY)
    return round(float(text)) if text else 0


# Every select call the fixture receives counts, rejected ones included, so an automatic replay shows up here.
def assert_attempts(ui, expected, timeout=10):
    deadline = time.monotonic() + timeout
    while attempts(ui) < expected and time.monotonic() < deadline:
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
    time.sleep(1.5)  # a replay would follow the answer
    found = attempts(ui)
    assert found == expected, f'the fixture received {found} select calls, expected {expected}'


def wait_selected(ui, count, timeout=20):
    deadline = time.monotonic() + timeout
    found = selected_args(ui)
    while len(found) < count and time.monotonic() < deadline:
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
        found = selected_args(ui)
    return found


# A select the fixture accepts is recorded only after its write delay, so "none sent" waits past that delay first.
def assert_none_selected(ui, what):
    time.sleep(write_delay_s() + 1.5)
    found = selected_args(ui)
    assert found == [], f'{what} still sent a select: {found}'


def assert_one_selected(ui, applicant):
    found = wait_selected(ui, 1)
    time.sleep(1.0)  # a duplicate send would land after the first record
    found = selected_args(ui)
    assert found == [{'bounty': BOUNTY, 'applicant': applicant}], f'expected exactly one select for {applicant}: {found}'


def fill_progress(shot, f, appearance):
    gold = token('--color-hold-fill', appearance)
    y = f['y'] + f['height'] - EDGE_ROW_FROM_BOTTOM
    lit = [x for x in range(round(f['x']), round(f['x'] + f['width'])) if close(shot.rgb(x, y), gold, COLOUR_SLACK)]
    if not lit:
        return 0.0
    return (max(lit) + 1 - f['x']) / f['width']


def label_split(shot, f, edge_x, appearance):
    tone = {name: token(name, appearance) for name in
            ('--color-hold-fill', '--color-on-hold-fill', '--color-hold-track', '--color-on-hold-track')}
    cy = f['y'] + f['height'] / 2

    def box(x0, x1):
        return {'x': x0, 'y': cy - 9, 'width': x1 - x0, 'height': 18}

    def tally(region):
        counts = {name: 0 for name in tone}
        for rgb in shot.pixels(region):
            for name, colour in tone.items():
                if close(rgb, colour, COLOUR_SLACK):
                    counts[name] += 1
        return counts

    return tally(box(edge_x - 44, edge_x - 4)), tally(box(edge_x + 4, edge_x + 44))


def analyse(video, f, points_wide, appearance, keep=None):
    samples = []
    with tempfile.TemporaryDirectory() as tmp:
        for path, at in frames(video, tmp, FRAME_GAP_S):
            shot = Shot(path, points_wide)
            progress = fill_progress(shot, f, appearance)
            samples.append((at, progress, keep(shot, progress) if keep else None))
    return samples
