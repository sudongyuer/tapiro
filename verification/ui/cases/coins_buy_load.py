"""Worst loads of the packs: the first StoreKit product request fails, so the sheet reads 「价格没加载出来」 with 重试 and no
pack and no price (never an empty shop); 重试 loads the three packs."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import assert_packs, open_page  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/coins/', 'src/app/buy-coins.tsx', 'src/lib/i18n/locales/coins/', 'verification/ui/coins.py']
SCENE = 'coins-page'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyStore', 'productsFailed']

ui = UI(*sys.argv[1:])
open_page(ui)
ui.tap('coins-buy')
ui.element('buy-coins', timeout=30)
failed = ui.element('buy-coins-failed', timeout=30)
assert failed.get('AXLabel') == ui.t('coins.buy.failed'), failed.get('AXLabel')
items = ui.read()
assert by_id(items, 'buy-coins-empty') is None and by_id(items, 'buy-coins-buy-5') is None
ui.at_rest()
ui.capture('01-failed')
ui.tap('buy-coins-retry')
ui.element('buy-coins-buy-5', timeout=30)
assert_packs(ui)
assert by_id(ui.read(), 'buy-coins-failed') is None
ui.capture('02-retried')
print('PASS: prices that did not load say so and 重试 loads them')
