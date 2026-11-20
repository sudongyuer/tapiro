"""Delete account blocked by an unsettled payment (audit A1): the payment row is a button at least 44 pt tall; tapping it
opens that payment's pay sheet over the delete sheet, and closing the pay sheet lands back on the delete sheet with the
row still listed and 删除 tappable again, so the user can retry once the payment settles."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402

DEPS = ['src/features/account/', 'src/app/delete-account.tsx', 'src/app/pay/', 'src/lib/useOnReturn.ts']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyDeletion', 'blocked']
BUDGET = 200
PAYMENT = 'delete-account-payment-00000000-0000-4000-8000-0000000000a1'

ui = UI(*sys.argv[1:])
reach_home(ui)
ui.tap('tab-me')
ui.tap('me-settings')
ui.tap('settings-delete')
ui.tap('delete-account-confirm')
ui.element('delete-account-message-blocked', timeout=10)
row = ui.element(PAYMENT)
assert row.get('type') == 'Button', f'the unsettled payment is not a button: {row.get("type")}'
assert_touch_target(row, PAYMENT)
assert by_id(ui.read(), 'delete-account-confirm').get('enabled') is False, '删除 is enabled while blocked'
ui.at_rest()
ui.capture('01-blocked')

ui.tap(PAYMENT)
ui.element('pay-sheet', timeout=30)
ui.at_rest()
ui.capture('02-pay-over-delete')
ui.tap_label(ui.t('pay.sheet.close'))
ui.gone('pay-sheet')
ui.element(PAYMENT)
ui.wait(lambda items: (by_id(items, 'delete-account-confirm') or {}).get('enabled') is True,
        '删除 stayed disabled after coming back from the payment')
ui.capture('03-back-on-delete')
print('PASS: a blocked payment row opens its pay sheet over the delete sheet and returns to it with 删除 tappable')
