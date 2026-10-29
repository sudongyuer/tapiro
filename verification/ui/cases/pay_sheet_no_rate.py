"""A ¥50 payment opened without a BNM rate: Alipay, WeChat and cash show ¥50 and can be chosen; the ringgit methods (DuitNow phone, bank, TNG) show 暂时不能换算成 RM, no amount, and cannot be chosen; there is no rate footer."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from pay import find, open_sheet  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'src/lib/money.ts', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyPayCurrency', 'CNY', '-uiVerifyFx', 'none']

YUAN_50 = r'¥\s?50\.00'
RINGGIT = ('duitnow_id', 'bank_account', 'duitnow_qr')

ui = UI(*sys.argv[1:])
amount = open_sheet(ui)
assert re.search(YUAN_50, amount.get('AXLabel') or ''), amount.get('AXLabel')
items = ui.read()
rows = {(i.get('AXUniqueId') or '').split('-')[2]: i for i in find(items, 'pay-method-')}
reason = ui.t('pay.sheet.noRate', currency='RM')
for kind in ('alipay', 'wechat'):
    row = rows[kind]
    label = row.get('AXLabel') or ''
    assert re.search(YUAN_50, label) and reason not in label, f'{kind} row {label!r}'
    assert row.get('enabled') is not False, f'{kind} is disabled'
blocked = [rows[kind] for kind in RINGGIT if kind in rows]
assert blocked, f'no ringgit method on screen: {sorted(rows)}'
for row in blocked:
    label = row.get('AXLabel') or ''
    assert reason in label and 'RM' not in label.replace(reason, ''), f'ringgit row {label!r}'
    assert row.get('enabled') is False, f'a ringgit row can be chosen without a rate: {row}'
assert by_id(items, 'pay-rate-footer') is None, 'a rate footer is shown without a locked rate'
ui.capture('01-no-rate')
ui.tap(blocked[0]['AXUniqueId'])
assert by_id(ui.read(), 'pay-mark-paid') is None, 'a disabled row was chosen'
ui.tap(rows['alipay']['AXUniqueId'])
ui.element('pay-qr-image')
ui.element('pay-mark-paid')
ui.capture('02-alipay')
print('PASS: without a rate only yuan methods can be chosen')
