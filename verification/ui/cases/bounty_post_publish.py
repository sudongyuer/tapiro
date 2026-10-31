"""With a free post left, the confirm screen previews the draft (title, RM 8), reads 本月免费 · 还剩 2/3, and pins 发出去
at the bottom over the list; 发出去 closes the sheet back to 悬赏 and the next 「+」 opens the tile screen (22A as amended by 2026-10-31), whose 直接写 shows an empty form. The video shows the tap."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import CONFIRM_TITLE, DEMO_TITLE, assert_cost, assert_preview, assert_pinned, assert_title, open_confirm, open_sheet, value  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'demo', '-uiVerifyPostCost', 'free']

ui = UI(*sys.argv[1:])
open_confirm(ui)
assert_title(ui, CONFIRM_TITLE)
assert_preview(ui, DEMO_TITLE, '8')
assert_cost(ui, ui.t('bounty.post.cost.free', left=2, of=3))
assert_pinned(ui, 'bounty-post-publish', '发出去')
ui.wait_label('bounty-post-publish', lambda label: label == ui.t('bounty.post.confirm.publish'), '发出去 label wrong')
ui.capture('01-confirm')
ui.tap('bounty-post-publish')
ui.gone('bounty-post-confirm')
ui.element('home-scroll')
ui.capture('02-home')
open_sheet(ui)
ui.element('bounty-post-pick')
ui.capture('03-pick')
ui.tap('bounty-post-pick-free')
ui.element('bounty-post-form')
ui.wait(lambda items: value(ui, 'bounty-post-title') == '' and value(ui, 'bounty-post-reward') == '',
        'the published draft is still in the form')
ui.capture('04-empty-form')
print('PASS: free cost line, pinned 发出去, publish closes the sheet and clears the draft')
