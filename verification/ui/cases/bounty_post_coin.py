"""With no free post left and 4 coins, the cost row reads 1 貘币 · 余额 4 with the coin footer, the button reads
发出去 · 1 貘币, and publishing closes the sheet."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import assert_cost, assert_pinned, open_confirm  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'demo', '-uiVerifyPostCost', 'coin']

ui = UI(*sys.argv[1:])
open_confirm(ui)
assert_cost(ui, ui.t('bounty.post.cost.coin', balance=4))
ui.labelled(ui.t('bounty.post.cost.footer.coin', of=3))
assert_pinned(ui, 'bounty-post-publish', '发出去 · 1 貘币')
ui.wait_label('bounty-post-publish', lambda label: label == ui.t('bounty.post.confirm.publishCoin'),
              'the coin button label is wrong')
ui.capture('01-coin')
ui.tap('bounty-post-publish')
ui.gone('bounty-post-confirm')
ui.element('home-scroll')
print('PASS: coin cost line and button, publish closes the sheet')
