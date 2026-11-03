"""A live signal while the 挑人 screen is open (spec 171 A). The verify emitter replaces the Realtime channel and records
each step it delivers in the defaults key uiVerifyLiveSteps; the fixture counts applicant loads in
uiVerifyApplicantLoads, and with the `grows` set any second load brings in Mei Ling. After the signal for another bounty
is delivered, the list has not loaded again: 阿杰, Hana and Aiman stay and the header counts 3 人申请. The bounty.applied
signal for this bounty then loads the list once more without a pull, and Mei Ling fades in below the other three with
4 人申请 (the clip shows the arrival). The channel drops next: after the 3 s grace the small 「可能不是最新」 line sits under
the header (172 B), and it goes away when the channel is back."""
import json
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from choose import defaults  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/lib/live/', 'src/features/bounty/select/', 'src/ui/OfflineLine.tsx', 'src/app/(tabs)/_layout.tsx',
        'verification/ui/choose.py']
SCENE = 'bounty-applicants'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyApplicants', 'grows', '-uiVerifyLive',
        '8000:bounty.applied:fixture-bounty-other,20000:bounty.applied:fixture-bounty-01,28000:drop,38000:back']
OTHER = 'bounty.applied:fixture-bounty-other'
MINE = 'bounty.applied:fixture-bounty-01'
JIE, HANA, AIMAN, MEI = (f'bounty-applicant-fixture-applicant-{name}' for name in ('jie', 'hana', 'aiman', 'mei'))
OFFLINE = 'bounty-applicants-offline'

ui = UI(*sys.argv[1:])


def delivered():
    text = defaults(ui, 'uiVerifyLiveSteps')
    return json.loads(text) if text else []


def loads():
    text = defaults(ui, 'uiVerifyApplicantLoads')
    return int(text) if text else 0


def wait_delivered(label):
    ui.wait(lambda items: label in delivered() or None, f'the emitter never delivered {label}: {delivered()}',
            timeout=40)


ui.settled(lambda items: by_id(items, AIMAN), 'the three applicants never settled')
wait_delivered(OTHER)
before = loads()
time.sleep(2)
items = ui.read()
assert MINE not in delivered(), 'the signal for this bounty came before the other one could be checked'
assert loads() == before, f'the signal for another bounty loaded the list again ({before} → {loads()})'
assert by_id(items, MEI) is None, 'Mei Ling is listed before the signal for this bounty'
status = by_id(items, 'bounty-applicants-status')
assert status and status.get('AXLabel') == ui.tn('bounty.select.statusOpen', 3), status and status.get('AXLabel')
assert by_id(items, OFFLINE) is None, 'the offline line shows while the channel is connected'
ui.capture('01-after-other-signal')

wait_delivered(MINE)
ui.wait_label('bounty-applicants-status', lambda text: text == ui.tn('bounty.select.statusOpen', 4),
              'the bounty.applied signal did not refetch the list', timeout=30)
assert loads() > before, f'the list did not load again after {MINE}'
mei = ui.settled(lambda items: by_id(items, MEI), 'Mei Ling never appeared after the signal')
aiman = by_id(ui.read(), AIMAN)
assert aiman['frame']['y'] < mei['frame']['y'], 'Mei Ling is not below the earlier applicants'
ui.at_rest()
ui.capture('02-after-signal')

wait_delivered('drop')
line = ui.settled(lambda items: by_id(items, OFFLINE), 'the offline line never appeared after the drop', timeout=30)
assert line.get('AXLabel') == ui.t('live.offline'), line.get('AXLabel')
header = by_id(ui.read(), 'bounty-applicants-status')
assert line['frame']['y'] > header['frame']['y'], 'the offline line is not under the header'
ui.capture('03-offline')

wait_delivered('back')
ui.gone(OFFLINE, timeout=30)
ui.at_rest()
ui.capture('04-back')
print('PASS: a signal for another bounty loads nothing, this bounty refetches with Mei Ling, the offline line follows the channel')
