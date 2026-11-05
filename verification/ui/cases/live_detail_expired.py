"""A pending applicant has the bounty detail open when it expires (realtime decision 2026-11-05). The fixture answers
the first detail load as open with the application pending and every later load as closed, and records each detail load
with its time since launch (uiVerifyDetailLoads). The detail must be open before the first signal. The verify emitter
sends bounty.expired for another bounty first: no detail load starts and the detail still shows 已申请 with 撤回申请.
Then it sends bounty.expired for this bounty: exactly one load starts, and without a pull the detail reads
这条悬赏已经关闭了 while 已申请 and 撤回申请 are gone."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import visible  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id  # noqa: E402
from live import entries, new_run, step_at  # noqa: E402

DEPS = ['src/lib/live/', 'src/lib/verifyRecord.ts', 'src/features/bounty/detail/', 'src/features/bounty/board/',
        'src/app/(tabs)/_layout.tsx', 'verification/ui/live.py', 'verification/ui/board.py', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans']
BUDGET = 240
BOUNTY = 'fixture-bounty-01'
OTHER = 'bounty.expired:fixture-bounty-other'
MINE = f'bounty.expired:{BOUNTY}'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyDetail', 'expiresLive',
        '-uiVerifyLive', f'40000:{OTHER},50000:{MINE}']
CARD = f'bounty-card-{BOUNTY}'
LOADS = 'uiVerifyDetailLoads'
RUN = new_run()

ui = UI(*sys.argv[1:])


def loads(since=0, until=float('inf')):
    return [e['at'] for e in entries(ui, LOADS, RUN) or [] if e['label'] == f'load:{BOUNTY}' and since <= e['at'] < until]


def delivered(label):
    return any(e['label'] == label for e in entries(ui, 'uiVerifyLiveSteps', RUN) or [])


relaunch(ui, drop=[], add=['-uiVerifyLiveRun', RUN])
card = visible(ui, CARD)
ui.at_rest()
f = card['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
ui.element('bounty-detail-applied')
ui.element('bounty-detail-withdraw')
ui.wait(lambda items: loads() or None, 'the detail never recorded its first load')
ui.at_rest()
assert not delivered(OTHER), 'the detail opened after the first signal, so the check would prove nothing'
ui.capture('01-applied')

other_at = step_at(ui, RUN, OTHER, timeout=60)
assert loads(until=other_at), 'the detail had not loaded before the first signal'
mine_at = step_at(ui, RUN, MINE, timeout=30)
assert loads(since=other_at, until=mine_at) == [], \
    f'the signal for another bounty started a detail load: {loads(since=other_at, until=mine_at)}'
ui.wait_label('bounty-detail-reason', lambda text: text == ui.t('bounty.detail.closed'),
              'the bounty.expired signal did not turn the open detail into 这条悬赏已经关闭了', timeout=20)
ui.wait(lambda items: loads(since=mine_at) or None, 'no detail load was recorded after the signal')
assert len(loads(since=mine_at, until=mine_at + 5000)) == 1, \
    f'the signal should start exactly one detail load: {loads(since=mine_at)}'
ui.gone('bounty-detail-applied')
ui.gone('bounty-detail-withdraw')
ui.at_rest()
ui.capture('02-closed')
