"""A payee who only takes cash has the cash row preselected with the hand-over note, and the payer has no 我已付款 to tap."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from pay import method_ids, open_sheet  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayMethods', 'cash']

ui = UI(*sys.argv[1:])
open_sheet(ui)
note = ui.element('pay-cash-note')
assert ui.t('pay.sheet.cash', name='阿杰') in (note.get('AXLabel') or ''), note.get('AXLabel')
items = ui.read()
assert [m.split('-')[0] for m in method_ids(items)] == ['cash'], method_ids(items)
assert by_id(items, 'pay-mark-paid') is None and by_id(items, 'pay-reference-value') is None, 'cash shows transfer steps'
ui.capture('01-cash')
print('PASS: cash only, no 我已付款')
