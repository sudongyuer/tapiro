"""The payee sees 小林说已付款 with the method and screenshot note and opens the screenshot; 还没收到 shows the reminder card and the 24-hour report placeholder; 已收到 after an earlier settle plays the routine celebration (又帮成一单, sticker 2, no badge) and 好的 returns to the 已结清 sheet."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from celebration import assert_celebration  # noqa: E402
from driver import UI, by_id  # noqa: E402
from pay import open_sheet  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py', 'verification/ui/celebration.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayment', 'fixture-owed', '-uiVerifyStickers', 'one']

ui = UI(*sys.argv[1:])
open_sheet(ui)
says = ui.element('pay-payee-says-paid')
label = says.get('AXLabel') or ''
assert ui.t('pay.payee.saysPaid', name='小林') in label and 'DuitNow' in label and ui.t('pay.payee.proof') in label, label
ui.capture('01-says-paid')
ui.tap('pay-view-proof')
ui.element('pay-proof-image')
ui.capture('01b-proof')
ui.tap('pay-proof-close')
ui.gone('pay-proof-image')
ui.tap('pay-not-received')
nudged = ui.element('pay-payee-nudged')
assert ui.t('pay.payee.report') in (nudged.get('AXLabel') or ''), nudged.get('AXLabel')
assert by_id(ui.read(), 'pay-not-received') is None, '还没收到 still offered'
ui.capture('02-nudged')
ui.tap('pay-confirm')
assert_celebration(ui, first=False, count=2, title='帮带一杯咖啡', name='小林', amount=r'RM\s?8\.00', shot_name='03-routine', cny=r'13\.07')
ui.tap('pay-celebration-done')
ui.gone('pay-celebration')
settled = ui.element('pay-settled')
assert re.search(ui.pattern('pay.celebrate.tick', amount=r'RM\s?8\.00'), settled.get('AXLabel') or ''), settled.get('AXLabel')
ui.capture('04-settled')
print('PASS: payee nudges, then confirms with the routine celebration')
