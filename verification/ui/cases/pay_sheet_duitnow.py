"""A payee with only a DuitNow phone has that row preselected; the number and the TP- reference each copy with 已复制 feedback, the bank hint says 打开你的银行 App，选 DuitNow, and there is no CNY line."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from pay import method_ids, open_sheet, scroll_to  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayMethods', 'duitnow']

ui = UI(*sys.argv[1:])
amount = open_sheet(ui)
assert '¥' not in (amount.get('AXLabel') or ''), 'CNY line shown for DuitNow'
items = ui.read()
assert [m.split('-')[0] for m in method_ids(items)] == ['duitnow_id'], method_ids(items)
number = ui.element('pay-number-value')
assert '+60 12-345 6789' in (number.get('AXLabel') or ''), number.get('AXLabel')
ui.capture('01-preselected')
ui.tap('pay-number-copy')
ui.wait_label('pay-number-copy', lambda label: '已复制' in label, 'number copy gave no feedback')
reference = scroll_to(ui, 'pay-reference-value')
assert re.search(r'TP-[A-HJ-NP-Z2-9]{4}', reference.get('AXLabel') or ''), reference.get('AXLabel')
ui.tap('pay-reference-copy')
ui.wait_label('pay-reference-copy', lambda label: '已复制' in label, 'reference copy gave no feedback')
assert any('打开你的银行 App，选 DuitNow' in (i.get('AXLabel') or '') for i in ui.read()), 'bank hint missing'
ui.capture('02-copied')
print('PASS: single DuitNow method preselected with copy feedback')
