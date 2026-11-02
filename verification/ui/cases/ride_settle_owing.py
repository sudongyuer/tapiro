"""The rider the next day at 09:10, still owing (216 A). The ticket status reads 欠款 · 昨天到的 and leads with
「RM 24.70 还欠小林」 with the cell 已欠 1 天; a warning card says what Tapiro reminds and when publishing pauses. 阿明's row
reads ✓ 已结清 and yours 还没付; the pay button stays."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/ride/', 'src/lib/i18n/locales/rideSettle/']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 180
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'owing']
SELF = '00000000-0000-4000-8000-000000000001'
MONEY = r'RM\s?'

ui = UI(*sys.argv[1:])

ticket = ui.element('ride-detail-ticket').get('AXLabel') or ''
assert re.search(MONEY + r'24\.70 ' + re.escape(ui.t('rideSettle.ticket.leadOwe', name='小林')), ticket), ticket
assert f"{ui.t('rideSettle.ticket.owed')} {ui.tn('rideSettle.ticket.owedValue', 1)}" in ticket, ticket
owe = ui.element('ride-settle-owe')
assert owe, 'the owing card is missing'
assert ui.element(f'ride-settle-paid-{SELF}').get('AXLabel') == ui.t('rideSettle.paid.due')
assert by_id(ui.read(), 'ride-detail-pay'), 'the pay button is missing'
ui.at_rest()
ui.snap('01-owing')
print('PASS: 已欠 1 天 on the ticket and the Tapiro reminder card')
