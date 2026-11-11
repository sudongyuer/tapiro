"""Paid but not confirmed (the first iap-verify answers 503): the sheet reads 购买处理中 with 再确认一次, the balance stays
13 and the StoreKit transaction is not finished; nothing is sent again on its own. Closed, the 貘币 page keeps the
购买处理中 line; 再确认一次 sends it once more, the line goes, the balance reads 18 and only then is it finished."""
import json
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import tap_price, balance_label, coin_calls, open_page, open_sheet, sheet_balance, wait_status  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/coins/', 'src/app/(tabs)/me/', 'src/app/buy-coins.tsx', 'src/lib/i18n/locales/coins/',
        'src/debug/CoinsScenes.tsx', 'verification/ui/coins.py']
SCENE = 'coins-page'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyStore', 'processing']

ui = UI(*sys.argv[1:])
open_page(ui)
open_sheet(ui)
tap_price(ui, 'buy-coins-buy-5')
wait_status(ui, 'coins.buy.processing')
status = ui.element('buy-coins-status').get('AXLabel') or ''
assert ui.t('coins.buy.processingBody') in status, status
ui.element('buy-coins-recheck')
time.sleep(4)
sent = [call['name'] for call in json.loads(defaults(ui, 'uiVerifyCoinsCalls') or '[]')]
assert sent.count('verify') == 1, f'the purchase was sent again on its own: {sent}'
assert coin_calls(ui, 'finish', 1, timeout=1) == [], 'a purchase the server did not confirm was finished'
assert ui.element('buy-coins-balance').get('AXLabel') == sheet_balance(ui, 13)
ui.at_rest()
ui.capture('01-processing')

ui.tap_label(ui.t('coins.buy.close'))
ui.gone('buy-coins')
wait_status(ui, 'coins.buy.processing', prefix='coins-purchase')
assert ui.element('coins-balance').get('AXLabel') == balance_label(ui, 13, 2)
ui.at_rest()
ui.capture('02-page-processing')

ui.tap('coins-purchase-recheck')
ui.wait(lambda items: by_id(items, 'coins-purchase-status') is None, '购买处理中 never went after 再确认一次')
ui.wait_label('coins-balance', lambda text: text == balance_label(ui, 18, 2), 'the balance never read 18')
assert len(coin_calls(ui, 'verify', 2)) == 2 and len(coin_calls(ui, 'finish', 1)) == 1
assert len(coin_calls(ui, 'finish', 2, timeout=2)) == 1, 'finished more than once'
ui.at_rest()
ui.capture('03-credited')
print('PASS: an unconfirmed purchase reads 购买处理中 until the user asks again, then credits once')
