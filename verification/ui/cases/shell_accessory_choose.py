"""The poster's 「3 人申请，去选」 in the bottom accessory on 拼车 opens that bounty's 挑人 screen in 悬赏, not home: the
applicant rows load, choosing 阿杰 and holding sends exactly one select, and 返回 lands on home. Before 2026-11-21 the tap
went to the top of home, and the owner, expecting the applicants, read it as the selection failing."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from choose import JIE, assert_one_selected, choose, hold_select, row_id  # noqa: E402
from driver import UI, accessory, by_id, reach_home, selected  # noqa: E402

DEPS = ['src/features/shell/', 'src/app/(tabs)/_layout.tsx', 'src/features/bounty/select/', 'src/lib/liveItems.ts',
        'verification/ui/choose.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'bountyAction']
BUDGET = 180

ui = UI(*sys.argv[1:])

reach_home(ui)
ui.tap('tab-ride')
ui.wait(lambda items: selected(items) == ['tab-ride'] and accessory(items), '拼车 is not selected with the accessory shown')
ui.snap('01-ride-accessory')

ui.tap('urgent-accessory')
ui.settled(lambda items: by_id(items, row_id(JIE)) if selected(items) == ['tab-bounty'] else None,
           'tapping 去选 in the accessory did not open the applicants of that bounty in 悬赏')
assert accessory(ui.read()) is None, 'the accessory still points at the screen that is on top'
ui.snap('02-applicants')

choose(ui, JIE, '阿杰')
hold_select(ui)
ui.wait_label('bounty-select-done', lambda text: text == ui.t('bounty.select.done.title', name='阿杰'),
              'the screen never became 选好了阿杰')
assert_one_selected(ui, JIE)
ui.snap('03-done')

ui.tap('BackButton')
ui.element('home-scroll')
print('PASS: 去选 in the accessory opens the applicants, the hold selects 阿杰 once, and 返回 lands on home')
