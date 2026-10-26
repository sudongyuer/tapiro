"""A payee without any method shows the yellow 还没有可用的收款方式 card and nothing to pay with."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from pay import method_ids, open_sheet  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayMethods', 'none']

ui = UI(*sys.argv[1:])
open_sheet(ui)
card = ui.element('pay-no-methods')
assert ui.t('pay.sheet.none.title', name='阿杰') in (card.get('AXLabel') or ''), card.get('AXLabel')
items = ui.read()
assert method_ids(items) == [] and by_id(items, 'pay-mark-paid') is None, 'methods or mark paid shown'
ui.capture('01-none')
print('PASS: no methods explained')
