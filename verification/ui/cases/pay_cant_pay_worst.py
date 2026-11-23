"""Worst case: with the longest payee bank name the 付不了 button and its footer wrap inside the sheet, stay 44 pt and keep the whole name; after sending, the sent line wraps with the whole name too."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from pay import open_sheet, scroll_to  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayMethods', 'duitnow', '-uiVerifyFixture', 'worst']
LOCALES = ['zh-Hans', 'ms']
NAME = 'WAN NURUL AISYAH BINTI WAN ABDUL RAHMAN AL-HADDAD'

ui = UI(*sys.argv[1:])
open_sheet(ui)
button = scroll_to(ui, 'pay-cant-pay')
assert ui.t('pay.sheet.cantPay.action', name=NAME) in (button.get('AXLabel') or ''), button.get('AXLabel')
assert_touch_target(button, '付不了')
sheet = by_id(ui.read(), 'pay-sheet')['frame']
f = button['frame']
assert f['x'] >= sheet['x'] and f['x'] + f['width'] <= sheet['x'] + sheet['width'] + 1, f'付不了 runs off the sheet: {f}'
ui.capture('01-long-name')
ui.tap('pay-cant-pay')
sent = ui.wait_label('pay-cant-pay-sent', lambda label: ui.t('pay.sheet.cantPay.sent', name=NAME) in label,
                     'the sent line does not carry the whole name')
s = sent['frame']
assert s['x'] + s['width'] <= sheet['x'] + sheet['width'] + 1, f'the sent line runs off the sheet: {s}'
ui.capture('02-long-name-sent')
print('PASS: the longest name wraps in 付不了 and its sent line')
