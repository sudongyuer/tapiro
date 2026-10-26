"""With Alipay, WeChat and TNG codes the sheet lists them in that order with none chosen; choosing Alipay shows RM with 约 ¥（参考） and the BNM source, the QR, the name check and 存到相册 (no confirmed app link, so no open), which saves and shows the 扫一扫 → 相册 hint; 用另一台手机扫 shows the code full screen."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from pay import method_ids, open_sheet, scroll_to  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyPayMethods', 'wallets']

ui = UI(*sys.argv[1:])
amount = open_sheet(ui)
assert re.search(r'RM\s?15\.00', amount.get('AXLabel') or ''), f'amount label {amount.get("AXLabel")!r}'
items = ui.read()
kinds = [m.split('-')[0] for m in method_ids(items)]
assert kinds == ['alipay', 'wechat', 'duitnow_qr'], f'method order {kinds}'
assert by_id(items, 'pay-mark-paid') is None, 'mark paid shown before a method is chosen'
ui.capture('01-pick')
alipay = next(i for i in items if (i.get('AXUniqueId') or '').startswith('pay-method-alipay'))
assert_touch_target(alipay, 'Alipay row')
ui.tap(alipay['AXUniqueId'])
ui.element('pay-qr-image')
cny = ui.wait_label('pay-amount', lambda label: re.search(ui.pattern('pay.sheet.cny', amount=r'2[0-9]\.[0-9]{2}'), label), 'CNY reference missing')
assert by_id(ui.read(), 'pay-fx-source'), 'BNM source link missing'
ui.capture('02-alipay')
save = scroll_to(ui, 'pay-qr-save')
assert_touch_target(save, 'save button')
ui.tap('pay-qr-save')
status = scroll_to(ui, 'pay-qr-status-saved')
assert ui.t('pay.sheet.qr.saved') in (status.get('AXLabel') or ''), f'saved line {status.get("AXLabel")!r}'
scroll_to(ui, 'pay-name-check')
ui.capture('03-saved')
scroll_to(ui, 'pay-qr-full')
ui.tap('pay-qr-full')
ui.element('pay-qr-full-image')
ui.capture('04-full-screen')
ui.tap('pay-qr-full-done')
ui.gone('pay-qr-full-image')
print('PASS: wallets first, CNY reference, save to Photos and full-screen code')
