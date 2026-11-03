"""A live signal while the 挑人 screen is open (spec 171 A). The verify emitter replaces the Realtime channel and records
each step it delivers in uiVerifyLiveSteps; the fixture counts applicant loads in uiVerifyApplicantLoads. Both carry the
`-uiVerifyLiveRun` id the case relaunches with, because the preferences file can lag and still hold the last launch.
With the `stream` set every load after the first brings one more applicant (Mei Ling, then Wei Jie, then Siti), so any
load changes the header. The launch may load twice (mount, then the app turning active), so the case waits until the
header and the recorded loads agree and stay put before the first signal. After the signal for another bounty the
header stays for 3 s: it loaded nothing. The bounty.applied signal for this bounty loads the list once more without a
pull, and the next applicant fades in below the others with one more in the count (the clip shows the arrival). The
channel drops next: after the 3 s grace the small 「可能不是最新」 line sits under the header (172 B), and it goes away
when the channel is back."""
import json
import sys
import time
import uuid

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen  # noqa: E402
from bounty import relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/lib/live/', 'src/features/bounty/select/', 'src/ui/OfflineLine.tsx', 'src/app/(tabs)/_layout.tsx',
        'verification/ui/choose.py', 'verification/ui/board.py', 'verification/ui/bounty.py']
SCENE = 'bounty-applicants'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyApplicants', 'stream', '-uiVerifyLive',
        '30000:bounty.applied:fixture-bounty-other,45000:bounty.applied:fixture-bounty-01,55000:drop,80000:back']
OTHER = 'bounty.applied:fixture-bounty-other'
MINE = 'bounty.applied:fixture-bounty-01'
ROW = 'bounty-applicant-fixture-applicant-{}'
LATER = ['mei', 'wei', 'siti']
AIMAN = ROW.format('aiman')
OFFLINE = 'bounty-applicants-offline'
RUN = uuid.uuid4().hex[:12]

ui = UI(*sys.argv[1:])


def record(key, field, empty):
    text = defaults(ui, key)
    try:
        value = json.loads(text) if text else {}
    except ValueError:
        return None
    return value.get(field, empty) if isinstance(value, dict) and value.get('run') == RUN else None


def delivered():
    return record('uiVerifyLiveSteps', 'steps', []) or []


def loads():
    return record('uiVerifyApplicantLoads', 'loads', 0)


def wait_delivered(label):
    ui.wait(lambda items: label in delivered() or None, f'the emitter never delivered {label}: {delivered()}',
            timeout=40)


def shown(items):
    found = by_id(items, 'bounty-applicants-status')
    label = (found or {}).get('AXLabel') or ''
    return next((n for n in (3, 4, 5, 6) if label == ui.tn('bounty.select.statusOpen', n)), None)


relaunch(ui, drop=[], add=['-uiVerifyScene', SCENE, '-uiVerifyLiveRun', RUN], ready=AIMAN)
ui.wait(lambda items: loads() is not None or None, 'the loads of this launch were never recorded')


def settled_count():
    first = shown(ui.read())
    if first is None or loads() != first - 2:
        return None
    time.sleep(2)
    return first if shown(ui.read()) == first and loads() == first - 2 else None


count = ui.wait(lambda items: settled_count(), 'the header and the recorded loads never settled together', timeout=40)
assert OTHER not in delivered(), 'the launch loads settled only after the first signal; too late to tell it apart'
wait_delivered(OTHER)
time.sleep(3)
items = ui.read()
assert MINE not in delivered(), 'the signal for this bounty came before the other one could be checked'
assert shown(items) == count, f'the signal for another bounty loaded the list again ({count} → {shown(items)})'
assert by_id(items, OFFLINE) is None, 'the offline line shows while the channel is connected'
ui.capture('01-after-other-signal')

wait_delivered(MINE)
ui.wait(lambda items: shown(items) == count + 1 or None, 'the bounty.applied signal did not refetch the list',
        timeout=30)
ui.wait(lambda items: loads() == count - 1 or None, f'the signal should load the list once more: {loads()}')
arrived = ROW.format(LATER[count - 3])
ui.settled(lambda items: by_id(items, arrived), f'{arrived} never appeared after the signal')
ui.at_rest()
ui.capture('02-after-signal')

wait_delivered('drop')
line = ui.settled(lambda items: by_id(items, OFFLINE), 'the offline line never appeared after the drop', timeout=20)
assert line.get('AXLabel') == ui.t('live.offline'), line.get('AXLabel')
header = by_id(ui.read(), 'bounty-applicants-status')
assert line['frame']['y'] > header['frame']['y'], 'the offline line is not under the header'
ui.capture('03-offline')

wait_delivered('back')
ui.gone(OFFLINE, timeout=30)
ui.at_rest()
ui.capture('04-back')

s = screen(ui.read())
ui.swipe((s['width'] / 2, s['height'] * 0.6), (s['width'] / 2, s['height'] * 0.3), 0.8)
ui.at_rest()
items = ui.read()
aiman, row = by_id(items, AIMAN), by_id(items, arrived)
assert aiman and row and aiman['frame']['y'] < row['frame']['y'], \
    f'the new applicant is not below the earlier ones: {aiman and aiman["frame"]} {row and row["frame"]}'
ui.capture('05-arrival-below')
print('PASS: a signal for another bounty loads nothing, this bounty loads once more and the new applicant arrives, '
      'the offline line follows the channel')
