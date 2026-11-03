"""A live signal while the 挑人 screen is open (spec 171 A). The verify emitter replaces the Realtime channel; it and the
fixture applicant service record, with times since launch and the `-uiVerifyLiveRun` id the case relaunches with, each
delivered step (uiVerifyLiveSteps) and each applicant load that starts (uiVerifyApplicantLoads). With the `stream` set
every load after the first brings one more applicant (Mei Ling, then Wei Jie, then Siti). No load starts between the
signal for another bounty and the signal for this one; exactly one starts right after this bounty's signal, and the
new applicant fades in below the others with one more in the header count (the clip shows the arrival). The channel
drops next: after the 3 s grace the small 「可能不是最新」 line sits under the header (172 B), and it goes away when the
channel is back."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id  # noqa: E402
from live import new_run, starts, step_at  # noqa: E402

DEPS = ['src/lib/live/', 'src/lib/verifyRecord.ts', 'src/lib/foreground.ts', 'src/features/bounty/select/',
        'src/ui/OfflineLine.tsx', 'src/app/(tabs)/_layout.tsx', 'verification/ui/live.py',
        'verification/ui/board.py', 'verification/ui/bounty.py']
SCENE = 'bounty-applicants'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyApplicants', 'stream', '-uiVerifyLive',
        '12000:bounty.applied:fixture-bounty-other,22000:bounty.applied:fixture-bounty-01,30000:drop,48000:back']
OTHER = 'bounty.applied:fixture-bounty-other'
MINE = 'bounty.applied:fixture-bounty-01'
LOADS = 'uiVerifyApplicantLoads'
ROW = 'bounty-applicant-fixture-applicant-{}'
LATER = ['mei', 'wei', 'siti']
AIMAN = ROW.format('aiman')
OFFLINE = 'bounty-applicants-offline'
RUN = new_run()

ui = UI(*sys.argv[1:])


def shown(items):
    found = by_id(items, 'bounty-applicants-status')
    label = (found or {}).get('AXLabel') or ''
    return next((n for n in (3, 4, 5, 6) if label == ui.tn('bounty.select.statusOpen', n)), None)


relaunch(ui, drop=[], add=['-uiVerifyScene', SCENE, '-uiVerifyLiveRun', RUN], ready=AIMAN)
other_at = step_at(ui, RUN, OTHER)
time.sleep(3)
count = shown(ui.read())
assert count, 'the header count never read'
launch_loads = starts(ui, LOADS, RUN, until=other_at)
assert count == 2 + len(launch_loads), f'{len(launch_loads)} loads before the first signal, the header counts {count}'
ui.capture('01-after-other-signal')

mine_at = step_at(ui, RUN, MINE)
ui.wait(lambda items: shown(items) == count + 1 or None, 'the bounty.applied signal did not refetch the list',
        timeout=30)
ui.wait(lambda items: starts(ui, LOADS, RUN, since=mine_at) or None, 'no load start was recorded after the signal')
assert starts(ui, LOADS, RUN, since=other_at, until=mine_at) == [], \
    f'the signal for another bounty started a load: {starts(ui, LOADS, RUN, since=other_at, until=mine_at)}'
assert len(starts(ui, LOADS, RUN, since=mine_at, until=mine_at + 5000)) == 1, \
    f'the signal should start exactly one load: {starts(ui, LOADS, RUN, since=mine_at)}'
arrived = ROW.format(LATER[count - 3])
ui.settled(lambda items: by_id(items, arrived), f'{arrived} never appeared after the signal')
ui.at_rest()
ui.capture('02-after-signal')

step_at(ui, RUN, 'drop')
line = ui.settled(lambda items: by_id(items, OFFLINE), 'the offline line never appeared after the drop', timeout=20)
assert line.get('AXLabel') == ui.t('live.offline'), line.get('AXLabel')
header = by_id(ui.read(), 'bounty-applicants-status')
assert line['frame']['y'] > header['frame']['y'], 'the offline line is not under the header'
ui.capture('03-offline')

step_at(ui, RUN, 'back')
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
print('PASS: no load starts for another bounty\'s signal, exactly one for this bounty\'s, the new applicant arrives, '
      'the offline line follows the channel')
