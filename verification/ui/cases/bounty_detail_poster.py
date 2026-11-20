"""The poster's own bounty in the detail (audit D1). Open: the status line 你发的悬赏 · 正在等人申请 and 查看申请人 pinned
(at least 44 pt), no 申请; 查看申请人 pushes the applicants screen in 悬赏 with 阿杰 listed. Assigned: the line names the
helper (阿杰接了) above 看进度. A cold-start 悬赏过期了 tap for the poster lands on the applicants screen, not on a detail
with no explanation."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import visible  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402

DEPS = ['src/features/bounty/detail/', 'src/features/bounty/select/', 'src/app/(tabs)/bounty/',
        'src/lib/notifications/', 'src/app/(tabs)/_layout.tsx', 'verification/ui/board.py', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
BOUNTY = 'fixture-bounty-01'
CARD = f'bounty-card-{BOUNTY}'
OWN = ['-uiVerifyOwnBounty', BOUNTY]
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyOwnBounty', 'fixture-bounty-01']

ui = UI(*sys.argv[1:])


def open_detail():
    card = visible(ui, CARD)
    ui.at_rest()
    f = card['frame']
    ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
    ui.element('bounty-detail-title')


reach_home(ui)
open_detail()
line = ui.element('bounty-detail-own-open', timeout=45)
assert line.get('AXLabel') == ui.t('bounty.detail.poster.open'), line.get('AXLabel')
button = ui.element('bounty-detail-applicants')
assert button.get('AXLabel') == ui.t('bounty.detail.poster.applicants'), button.get('AXLabel')
assert_touch_target(button, 'bounty-detail-applicants')
assert by_id(ui.read(), 'bounty-detail-apply') is None, 'the poster is offered 申请 on their own bounty'
ui.at_rest()
ui.capture('01-own-open')

ui.tap('bounty-detail-applicants')
ui.element('bounty-applicant-fixture-applicant-jie', timeout=45)
back = ui.element('BackButton')
assert back.get('AXLabel') == ui.t('shell.home.title'), f'申请人 is not pushed in 悬赏: back reads {back.get("AXLabel")}'
ui.at_rest()
ui.capture('02-applicants')

relaunch(ui, drop=OWN, add=[*OWN, '-uiVerifyPosted', 'assigned'])
open_detail()
line = ui.element('bounty-detail-own-underway', timeout=45)
assert line.get('AXLabel') == ui.t('bounty.status.summary.poster.assigned', name='阿杰'), line.get('AXLabel')
assert ui.element('bounty-detail-progress').get('AXLabel') == ui.t('bounty.status.action.view')
ui.at_rest()
ui.capture('03-own-assigned')

relaunch(ui, drop=OWN, add=[*OWN, '-uiVerifyNoticeTap', f'bounty.expired:{BOUNTY}'],
         ready='bounty-applicant-fixture-applicant-jie')
ui.at_rest()
assert by_id(ui.read(), 'bounty-detail-title') is None, 'the expired tap left the poster on the detail'
ui.capture('04-expired-tap')
print('PASS: own bounty shows its status line with 查看申请人 or 看进度; the poster expired tap lands on the applicants')
