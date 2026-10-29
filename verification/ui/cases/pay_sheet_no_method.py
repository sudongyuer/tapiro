"""A ¥50 payment without a BNM rate, to a payee who only takes DuitNow (ringgit): the yellow card says 阿杰还没有能收人民币的方式 with the add-a-method hint, and nothing can be chosen or marked paid."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from pay import method_ids, open_sheet  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'src/lib/money.ts', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyPayCurrency', 'CNY', '-uiVerifyFx', 'none', '-uiVerifyPayMethods', 'duitnow']

ui = UI(*sys.argv[1:])
amount = open_sheet(ui)
assert re.search(r'¥\s?50\.00', amount.get('AXLabel') or ''), amount.get('AXLabel')
card = ui.element('pay-no-methods')
title = ui.t('pay.sheet.noCurrency', name='阿杰', currency=ui.t('pay.sheet.currencyName.CNY'))
label = card.get('AXLabel') or ''
assert title in label and ui.t('pay.sheet.none.body') in label, label
items = ui.read()
assert method_ids(items) == [] and by_id(items, 'pay-mark-paid') is None, 'methods or mark paid shown'
ui.capture('01-no-method')
print('PASS: a payee without a way to receive yuan is explained and nothing is paid')
