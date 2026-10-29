"""The poster's applicant screen keys on the bounty status (Task 9, ruling 1). Assigned with 阿杰 chosen: 选好了阿杰 with
阿杰 as one row and 看进度 pinned (at least 44 pt), which pushes the poster's status screen (阿杰接了). Cancelled after
selection: the header reads 这单取消了 with no 选好了阿杰, no chosen row and no hold button, and 看进度 pushes the status
screen reading 这单取消了."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/bounty/select/', 'src/features/bounty/shared/', 'src/features/bounty/board/',
        'src/features/bounty/status/', 'src/ui/PillButton.tsx', 'src/ui/SheetFrame.tsx', 'src/app/(tabs)/bounty/',
        'verification/ui/bounty.py']
SCENE = 'bounty-applicants'
BUDGET = 240
FIRST = ['-uiVerifyPosted', 'assigned', '-uiVerifyBountyStatus', 'assigned']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyPosted', 'assigned', '-uiVerifyBountyStatus', 'assigned']

ui = UI(*sys.argv[1:])


def progress_to_status(summary, shot):
    button = ui.element('bounty-applicants-progress')
    assert button.get('AXLabel') == ui.t('bounty.status.action.view'), button.get('AXLabel')
    assert_touch_target(button, ui.t('bounty.status.action.view'))
    ui.at_rest()
    ui.tap('bounty-applicants-progress')
    ui.wait_label('bounty-status-summary', lambda text: text == summary,
                  f'看进度 did not push the status screen reading {summary}')
    ui.element('bounty-status-step-selected')
    ui.at_rest()
    ui.capture(shot)


ui.wait_label('bounty-select-done', lambda text: text == ui.t('bounty.select.done.title', name='阿杰'),
              'the assigned bounty never shows 选好了阿杰')
row = ui.element('bounty-select-done-row')
assert '阿杰' in (row.get('AXLabel') or ''), f'the chosen row reads {row.get("AXLabel")!r}'
ui.at_rest()
ui.capture('01-assigned')
progress_to_status(ui.t('bounty.status.summary.poster.assigned', name='阿杰'), '02-assigned-status')

relaunch(ui, drop=FIRST, add=['-uiVerifyScene', SCENE, '-uiVerifyPosted', 'cancelled',
                              '-uiVerifyBountyStatus', 'cancelled'], ready='bounty-applicants-title')
ui.wait_label('bounty-applicants-status', lambda text: text == ui.t('bounty.status.cancelled'),
              'the cancelled bounty never shows 这单取消了')
items = ui.read()
for absent in ('bounty-select-done', 'bounty-select-done-row', 'bounty-select-hold', 'bounty-applicants-closed'):
    assert by_id(items, absent) is None, f'{absent} is shown on a bounty cancelled after selection'
assert not any((item.get('AXLabel') or '') == ui.t('bounty.select.done.title', name='阿杰') for item in items), \
    '选好了阿杰 is still shown after the cancel'
ui.at_rest()
ui.capture('03-cancelled')
progress_to_status(ui.t('bounty.status.summary.poster.cancelled'), '04-cancelled-status')
print('PASS: assigned shows 选好了阿杰 and 看进度 to the status screen; cancelled shows 这单取消了 and 看进度, never 选好了')
