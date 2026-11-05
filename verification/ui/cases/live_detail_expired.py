"""A pending applicant has the bounty detail open when it expires (realtime decision 2026-11-05). The fixture answers
the first detail load as open with the application pending and every later load as closed. The verify emitter sends
bounty.expired for another bounty first: the detail still shows 已申请 with 撤回申请. Then it sends bounty.expired for this
bounty: without a pull the detail reads 这条悬赏已经关闭了, and 已申请 and 撤回申请 are gone."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import visible  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id  # noqa: E402
from live import new_run, step_at  # noqa: E402

DEPS = ['src/lib/live/', 'src/lib/verifyRecord.ts', 'src/features/bounty/detail/',
        'src/features/bounty/board/fixtureBoardService.ts', 'src/app/(tabs)/_layout.tsx', 'verification/ui/live.py',
        'verification/ui/board.py', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans']
BUDGET = 240
OTHER = 'bounty.expired:fixture-bounty-other'
MINE = 'bounty.expired:fixture-bounty-01'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyDetail', 'expiresLive',
        '-uiVerifyLive', f'35000:{OTHER},45000:{MINE}']
CARD = 'bounty-card-fixture-bounty-01'
RUN = new_run()

ui = UI(*sys.argv[1:])

relaunch(ui, drop=[], add=['-uiVerifyLiveRun', RUN])
card = visible(ui, CARD)
ui.at_rest()
f = card['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
ui.element('bounty-detail-applied')
ui.element('bounty-detail-withdraw')
ui.at_rest()
ui.capture('01-applied')

step_at(ui, RUN, OTHER, timeout=60)
ui.at_rest()
items = ui.read()
assert by_id(items, 'bounty-detail-applied') and by_id(items, 'bounty-detail-withdraw'), \
    'a signal for another bounty changed the open detail'
assert not by_id(items, 'bounty-detail-reason'), 'the detail read closed before its own signal'

step_at(ui, RUN, MINE, timeout=30)
ui.wait_label('bounty-detail-reason', lambda text: text == ui.t('bounty.detail.closed'),
              'the bounty.expired signal did not turn the open detail into 这条悬赏已经关闭了', timeout=20)
ui.settled(lambda items: (not by_id(items, 'bounty-detail-applied') and not by_id(items, 'bounty-detail-withdraw'))
           or None, '已申请 or 撤回申请 stayed after the bounty expired')
ui.at_rest()
ui.capture('02-closed')
