"""The payer's DuitNow row has 付不了？告诉 LIM WEI JIE under the name check, a 44 pt plain button with a footer saying the payee will be asked to check; tapping it turns the section into the quiet 已提醒…检查这个收款方式 line, with no button left to send it twice, while 我已付款 stays available."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from pay import assert_pinned, open_sheet, scroll_to  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayMethods', 'duitnow']
LOCALES = ['zh-Hans', 'ms']
NAME = 'LIM WEI JIE'

ui = UI(*sys.argv[1:])
open_sheet(ui)
button = scroll_to(ui, 'pay-cant-pay')
assert ui.t('pay.sheet.cantPay.action', name=NAME) in (button.get('AXLabel') or ''), button.get('AXLabel')
assert_touch_target(button, '付不了')
footer = ui.t('pay.sheet.cantPay.footer', name=NAME)
assert any(footer in (i.get('AXLabel') or '') for i in ui.read()), f'footer {footer!r} missing'
check = by_id(ui.read(), 'pay-name-check')
assert check and check['frame']['y'] < button['frame']['y'], '付不了 is not under the name check'
ui.capture('01-cant-pay')

ui.tap('pay-cant-pay')
sent = ui.wait_label('pay-cant-pay-sent', lambda label: ui.t('pay.sheet.cantPay.sent', name=NAME) in label,
                     'the sent line never replaced 付不了')
items = ui.read()
assert by_id(items, 'pay-cant-pay') is None, '付不了 is still offered after it was sent'
assert by_id(items, 'pay-failed') is None, 'the report showed 没成功'
assert_pinned(ui, 'pay-mark-paid', '我已付款')
ui.capture('02-sent')
print('PASS: 付不了 sends once and leaves a quiet line; 我已付款 stays')
