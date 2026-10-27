"""With a free post left, the confirm screen previews the draft (title, RM 8), reads 本月免费 · 还剩 2/3, and pins 发出去
below the form; 发出去 closes the sheet back to 悬赏 and the next 「+」 opens an empty form. The video shows the tap."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import CONFIRM_TITLE, DEMO_TITLE, assert_cost, assert_pinned, assert_title, open_confirm, open_post, value  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'demo', '-uiVerifyPostCost', 'free']

ui = UI(*sys.argv[1:])
open_confirm(ui)
assert_title(ui, CONFIRM_TITLE)
ui.wait_label('bounty-post-preview', lambda label: DEMO_TITLE in label and re.search(r'RM\s?8\b', label),
              'the preview does not show the title and RM 8')
assert_cost(ui, ui.t('bounty.post.cost.free', left=2, of=3))
assert_pinned(ui, 'bounty-post-publish', '发出去')
ui.wait_label('bounty-post-publish', lambda label: label == ui.t('bounty.post.confirm.publish'), '发出去 label wrong')
ui.capture('01-confirm')
ui.tap('bounty-post-publish')
ui.gone('bounty-post-confirm')
ui.element('home-scroll')
ui.capture('02-home')
open_post(ui)
ui.wait(lambda items: value(ui, 'bounty-post-title') == '' and value(ui, 'bounty-post-reward') == '',
        'the published draft is still in the form')
ui.capture('03-empty-form')
print('PASS: free cost line, pinned 发出去, publish closes the sheet and clears the draft')
