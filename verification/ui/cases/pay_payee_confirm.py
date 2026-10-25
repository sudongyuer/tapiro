"""The payee sees 小林说已付款 with the method and screenshot note; 还没收到 shows the reminder card and the 24-hour report placeholder; 已收到 after an earlier settle shows the 已结清 tick without the full-screen celebration."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from pay import open_sheet  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayment', 'fixture-owed', '-uiVerifySettledBefore', '1']

ui = UI(*sys.argv[1:])
open_sheet(ui)
says = ui.element('pay-payee-says-paid')
label = says.get('AXLabel') or ''
assert '小林说已付款' in label and 'DuitNow' in label and '截图' in label, label
ui.capture('01-says-paid')
ui.tap('pay-not-received')
nudged = ui.element('pay-payee-nudged')
assert '24 小时' in (nudged.get('AXLabel') or ''), nudged.get('AXLabel')
assert by_id(ui.read(), 'pay-not-received') is None, '还没收到 still offered'
ui.capture('02-nudged')
ui.tap('pay-confirm')
settled = ui.element('pay-settled')
assert '已结清' in (settled.get('AXLabel') or ''), settled.get('AXLabel')
assert by_id(ui.read(), 'pay-celebration') is None, 'a later settle celebrated full screen'
ui.capture('03-settled')
print('PASS: payee nudges then confirms with a tick')
