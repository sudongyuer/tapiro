"""StoreKit knows none of the server's packs (App Store Connect has no product, or the Paid Apps agreement is missing,
as on a TestFlight build before either is done): the sheet reads 「价格没加载出来」 on the urgent card with 重试, no pack and
no price, never an empty shop; 重试 asks StoreKit again and, still answered with nothing, keeps the card."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import coin_calls, open_page  # noqa: E402
from driver import UI, assert_colour, by_id, token  # noqa: E402

DEPS = ['src/features/coins/', 'src/app/buy-coins.tsx', 'src/lib/i18n/locales/coins/', 'src/ui/NoticeCard.tsx',
        'verification/ui/coins.py']
SCENE = 'coins-page'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyStore', 'noProducts']


ui = UI(*sys.argv[1:])
open_page(ui)
ui.tap('coins-buy')
ui.element('buy-coins', timeout=30)
failed = ui.element('buy-coins-failed', timeout=30)
assert failed.get('AXLabel') == ui.t('coins.buy.failed'), failed.get('AXLabel')
items = ui.read()
assert by_id(items, 'buy-coins-buy-5') is None and by_id(items, 'buy-coins-loading') is None, 'packs beside the card'
asked = len(coin_calls(ui, 'products', 1))
assert asked >= 1, 'StoreKit was never asked'
ui.at_rest()
shot = ui.snap('01-none')
assert_colour(shot, by_id(ui.read(), 'buy-coins-failed')['frame'], token('--color-urgent-fill', ui.appearance),
              'the no-products card')
ui.tap('buy-coins-retry')
assert len(coin_calls(ui, 'products', asked + 1, timeout=30)) > asked, '重试 did not ask StoreKit again'
failed = ui.element('buy-coins-failed', timeout=30)
assert failed.get('AXLabel') == ui.t('coins.buy.failed'), failed.get('AXLabel')
assert by_id(ui.read(), 'buy-coins-buy-5') is None
ui.capture('02-retried')
print('PASS: no products from StoreKit reads as prices that did not load, with 重试, never an empty shop')
