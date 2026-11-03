"""A live signal while the 挑人 screen is open (spec 171 A): the verify emitter replaces the Realtime channel. A signal
for another bounty at 5 s changes nothing, so 阿杰, Hana and Aiman stay and the header counts 3 人申请; the
bounty.applied signal for this bounty at 15 s refetches the list without a pull, and Mei Ling fades in below the
other three with 4 人申请 (the clip shows the arrival). The channel drops at 22 s: after the 3 s grace the small
「可能不是最新」 line sits above the list (172 B), and it goes away when the channel is back at 32 s."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402

DEPS = ['src/lib/live/', 'src/features/bounty/select/', 'src/ui/OfflineLine.tsx', 'src/app/(tabs)/_layout.tsx']
SCENE = 'bounty-applicants'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyApplicants', 'grows', '-uiVerifyLive',
        '5000:bounty.applied:fixture-bounty-other,15000:bounty.applied:fixture-bounty-01,22000:drop,32000:back']
SIGNAL_AT = 15
JIE, HANA, AIMAN, MEI = (f'bounty-applicant-fixture-applicant-{name}' for name in ('jie', 'hana', 'aiman', 'mei'))
OFFLINE = 'bounty-applicants-offline'

started = time.monotonic()
ui = UI(*sys.argv[1:])


def status():
    found = ui.settled(lambda items: by_id(items, 'bounty-applicants-status'), 'the status line never settled')
    return found.get('AXLabel') or ''


ui.settled(lambda items: by_id(items, AIMAN), 'the three applicants never settled')
time.sleep(max(0.0, 6 - (time.monotonic() - started)))
items = ui.read()
elapsed = time.monotonic() - started
assert elapsed < SIGNAL_AT - 1, f'the first read came {elapsed:.1f} s after launch, too late to tell the signal apart'
assert by_id(items, MEI) is None, 'Mei Ling is listed before the signal for this bounty'
assert status() == ui.tn('bounty.select.statusOpen', 3), status()
assert by_id(items, OFFLINE) is None, 'the offline line shows while the channel is connected'
ui.capture('01-before-signal')

ui.wait_label('bounty-applicants-status', lambda text: text == ui.tn('bounty.select.statusOpen', 4),
              'the bounty.applied signal did not refetch the list', timeout=40)
mei = ui.settled(lambda items: by_id(items, MEI), 'Mei Ling never appeared after the signal')
aiman = by_id(ui.read(), AIMAN)
assert aiman['frame']['y'] < mei['frame']['y'], 'Mei Ling is not below the earlier applicants'
ui.at_rest()
ui.capture('02-after-signal')

line = ui.settled(lambda items: by_id(items, OFFLINE), 'the offline line never appeared after the drop', timeout=40)
assert line.get('AXLabel') == ui.t('live.offline'), line.get('AXLabel')
status_line = by_id(ui.read(), 'bounty-applicants-status')
assert line['frame']['y'] > status_line['frame']['y'], 'the offline line is not below the header'
ui.capture('03-offline')

ui.gone(OFFLINE, timeout=40)
ui.at_rest()
ui.capture('04-back')
print('PASS: a signal for another bounty is ignored, this bounty refetches with Mei Ling, the offline line follows the channel')
