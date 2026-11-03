"""The rider after the split, 07:26 (212 B, 213 A, 215 A). The ticket leads with 「RM 24.70 付给小林」 and the cells Grab
总价 RM 74.00 / 平分 3 人 / 你 还没付; the 结清 step reads 0/2 已付 with the Grab receipt row 小林附的 and one row each. The
bottom has 金额不对 and 「付给小林 RM 24.70」. The receipt opens full screen; 金额不对 opens the note sheet and sends
dispute_ride_share once; the pay button opens the built pay sheet titled 拼车."""
import json
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import typed  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from ride import tap_bar  # noqa: E402

DEPS = ['src/features/ride/', 'src/features/payment/', 'src/app/(tabs)/ride/', 'src/app/pay/',
        'src/lib/i18n/locales/rideSettle/', 'src/lib/i18n/locales/pay/']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'paying']
CALLS = 'uiVerifyRideDetailCalls'
MONEY = r'RM\s?'

ui = UI(*sys.argv[1:])

ticket = ui.element('ride-detail-ticket').get('AXLabel') or ''
assert re.search(MONEY + r'24\.70 ' + re.escape(ui.t('rideSettle.ticket.leadPay', name='小林')), ticket), ticket
assert f"{ui.t('rideSettle.ticket.you')} {ui.t('rideSettle.paid.due')}" in ticket, ticket
assert ui.element('ride-detail-settle-title').get('AXLabel') == ui.t('rideSettle.steps.settlePaid', paid=0, total=2)
items = ui.read()
assert by_id(items, 'ride-settle-receipt'), 'the receipt row is missing'
pay = by_id(items, 'ride-detail-pay')
assert pay and re.fullmatch(ui.pattern('rideSettle.footer.pay', name='小林', amount=MONEY + r'24\.70'),
                            pay.get('AXLabel') or ''), pay
assert_touch_target(pay, '付给小林')
assert by_id(items, 'ride-detail-dispute'), '金额不对 is missing'
ui.at_rest()
ui.snap('01-pay')

ui.tap('ride-settle-receipt')
ui.element('ride-receipt-image')
ui.capture('02-receipt')
ui.tap('ride-receipt-close')
ui.gone('ride-receipt-image')

ui.tap('ride-detail-dispute')
ui.element('ride-dispute')
typed(ui, 'ride-dispute-note', '我中途下车了')
tap_bar(ui, 'ride-dispute-confirm')
ui.gone('ride-dispute')
deadline = time.monotonic() + 10
sent = []
while time.monotonic() < deadline and not sent:
    text = defaults(ui, CALLS)
    sent = [call for call in (json.loads(text) if text else []) if call['name'] == 'dispute']
    time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
assert len(sent) == 1 and sent[0]['args']['note'] == '我中途下车了', sent
ui.element('ride-detail-disputed')

ui.tap('ride-detail-pay')
ui.element('pay-sheet')
ui.wait(lambda items: any(i.get('AXLabel') == ui.t('pay.sheet.titleRide') for i in items), 'the pay sheet is not titled 拼车')
ui.at_rest()
ui.capture('03-pay-sheet')
print('PASS: rider pays through the built sheet titled 拼车; receipt and 金额不对 work')
