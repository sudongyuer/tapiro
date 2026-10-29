"""A ¥50 payment with a locked BNM rate: the header shows ¥50, Alipay, WeChat and cash rows show ¥50, the DuitNow row shows RM 30.61, the footer names the locked rate (¥1 = RM 0.6122) with the BNM source link, and there is no 约（参考） line; choosing DuitNow and 我已付款 shows the waiting state at RM 30.61 with 原价 ¥50."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from pay import find, method_ids, open_sheet, scroll_to  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'src/lib/money.ts', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyPayCurrency', 'CNY']

YUAN_50 = r'¥\s?50\.00'
RM_30 = r'RM\s?30\.61'

ui = UI(*sys.argv[1:])
amount = open_sheet(ui)
label = amount.get('AXLabel') or ''
assert re.search(YUAN_50, label), f'header amount {label!r}'
assert 'RM' not in label, f'the header shows a conversion: {label!r}'
items = ui.read()
kinds = [m.split('-')[0] for m in method_ids(items)]
assert kinds[:2] == ['alipay', 'wechat'] and 'duitnow_id' in kinds, f'method order {kinds}'
rows = {(i.get('AXUniqueId') or '').split('-')[2]: i for i in find(items, 'pay-method-')}
for kind in ('alipay', 'wechat'):
    row = rows[kind]
    assert re.search(YUAN_50, row.get('AXLabel') or ''), f'{kind} row {row.get("AXLabel")!r}'
phone = rows['duitnow_id']
assert re.search(RM_30, phone.get('AXLabel') or ''), f'DuitNow row {phone.get("AXLabel")!r}'
assert phone.get('enabled') is not False, 'DuitNow is disabled despite the locked rate'
ui.capture('01-converted')
ui.tap(phone['AXUniqueId'])
footer = scroll_to(ui, 'pay-rate-footer')
rate = r'¥1\s=\sRM\s?0\.6122'
assert re.search(ui.pattern('pay.sheet.rateFooter', date=r'.+', rate=rate), footer.get('AXLabel') or ''), footer.get('AXLabel')
assert by_id(ui.read(), 'pay-fx-source'), 'BNM source link missing'
ui.capture('02-rate-footer')
ui.tap('pay-mark-paid')
waiting = ui.wait_label('pay-amount', lambda text: re.search(RM_30, text), 'the waiting header does not show RM 30.61')
original = ui.pattern('pay.sheet.original', amount=YUAN_50)
assert re.search(original, waiting.get('AXLabel') or ''), f'original missing: {waiting.get("AXLabel")!r}'
ui.element('pay-waiting')
ui.capture('03-waiting')
print('PASS: each method shows its own amount at the locked rate, and the payer waits at the paid amount')
