"""Ask to Buy: tapping a pack reads 等待批准 with a line that the coins arrive once a family member approves, the balance
stays 13; the approval arrives through StoreKit's updates, the server credits it and the sheet reads 「11 貘币已到账」
and 24 without another tap."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import coin_calls, open_page, open_sheet, sheet_balance, wait_status  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/features/coins/', 'src/app/buy-coins.tsx', 'src/lib/i18n/locales/coins/', 'verification/ui/coins.py']
SCENE = 'coins-page'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyStore', 'approved']

ui = UI(*sys.argv[1:])
open_page(ui)
open_sheet(ui)
ui.tap('buy-coins-buy-11')
wait_status(ui, 'coins.buy.pending', timeout=10)
assert ui.t('coins.buy.pendingBody') in (ui.element('buy-coins-status').get('AXLabel') or '')
assert ui.element('buy-coins-balance').get('AXLabel') == sheet_balance(ui, 13)
ui.capture('01-pending')
wait_status(ui, 'coins.buy.succeeded', coins=11)
ui.wait_label('buy-coins-balance', lambda text: text == sheet_balance(ui, 24), 'the balance never read 24')
assert len(coin_calls(ui, 'verify', 1)) == 1
ui.at_rest()
ui.capture('02-approved')
print('PASS: Ask to Buy waits, then credits when the approval arrives')
