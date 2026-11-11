"""A purchase StoreKit fails reads 「没买成，没有扣款」 in the urgent colour, sends nothing to the server and leaves the balance
at 13; the prices stay tappable for another try. Prices that did not load read 「价格没加载出来」 with 重试, which loads
them (the first StoreKit product request fails)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import assert_packs, coin_calls, open_page, sheet_balance, wait_status  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/coins/', 'src/app/buy-coins.tsx', 'src/lib/i18n/locales/coins/', 'verification/ui/coins.py']
SCENE = 'coins-page'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyStore', 'failed']

ui = UI(*sys.argv[1:])
open_page(ui)
ui.tap('coins-buy')
ui.element('buy-coins', timeout=30)
ui.element('buy-coins-buy-5', timeout=30)
assert_packs(ui)
ui.tap('buy-coins-buy-5')
wait_status(ui, 'coins.buy.failedPurchase')
assert coin_calls(ui, 'verify', 1, timeout=2) == [], 'a failed purchase reached the server'
assert ui.element('buy-coins-balance').get('AXLabel') == sheet_balance(ui, 13)
assert by_id(ui.read(), 'buy-coins-buy-5').get('enabled') is not False, 'the price stays disabled after a failure'
ui.at_rest()
ui.capture('01-failed')
print('PASS: a failed purchase says so and credits nothing')
