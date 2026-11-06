"""A new account with no history (`-uiVerifyCoins empty`): the page shows the balance it has and 「本月免费发布还剩 3 条（共
3 条）」, then 「还没有明细」 with no month header."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import balance_label, label, month_ids, open_page, row_ids  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/account/MeView.tsx', 'src/app/(tabs)/me/', 'src/lib/i18n/locales/coins/', 'src/lib/loadable.ts', 'src/ui/NoticeCard.tsx', 'src/debug/CoinsScenes.tsx', 'verification/ui/coins.py']
SCENE = 'coins-page'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'empty']

ui = UI(*sys.argv[1:])
open_page(ui)
assert label(ui, 'coins-balance') == balance_label(ui, 0, 3), label(ui, 'coins-balance')
ui.element('coins-empty', timeout=30)
items = ui.read()
assert by_id(items, 'coins-empty').get('AXLabel') == ui.t('coins.empty'), by_id(items, 'coins-empty')
assert not month_ids(items) and not row_ids(items), 'an empty history shows months or rows'
assert by_id(items, 'coins-failed') is None
ui.at_rest()
ui.capture('01-empty')
print('PASS: an empty history reads 还没有明细')
