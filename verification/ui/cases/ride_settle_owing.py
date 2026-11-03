"""The rider the next day at 09:10, still owing (216 A). The ticket status reads 欠款 · 昨天到的 and leads with
「RM 24.70 还欠小林」 with the cell 已欠 1 天; a warning card says what Tapiro reminds and when publishing pauses. 阿明's row
reads ✓ 已结清 and yours 还没付; the pay button stays. The 24 h reminder time has passed before the app opened, so only the
72 h one is scheduled, and the card names its time (step 7)."""
import json
import re
import sys
import time
from datetime import datetime, timedelta, timezone

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from choose import defaults  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/ride/', 'src/lib/i18n/locales/rideSettle/', 'src/lib/notifications/']
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


def pay_reminders():
    text = defaults(ui, 'uiVerifyScheduledNotices')
    return [notice for notice in (json.loads(text) if text else []) if notice['id'].endswith((':pay24', ':pay72'))]


def clock_of(notice):
    return datetime.fromtimestamp(notice['at'] / 1000, timezone(timedelta(hours=8))).strftime('%H:%M')


# The fixture places the split 25 h 44 min before each load, so a reload moves the 72 h reminder; read both together.
def names_reminder(label):
    pay = pay_reminders()
    seen.append((label, [notice['data']['kind'] for notice in pay]))
    if [notice['data']['kind'] for notice in pay] != ['ride.pay72']:
        return False
    expected = ui.pattern('rideSettle.owe.next', time=r'.+ ' + re.escape(clock_of(pay[0])))
    return re.fullmatch(expected, label) is not None


seen = []
try:
    ui.wait_label('ride-settle-owe-reminder', names_reminder, 'the owing card does not name the 72 h reminder')
except AssertionError:
    raise AssertionError(f'the owing card does not name the only scheduled reminder (72 h): {seen[-1:]}') from None
assert ui.element(f'ride-settle-paid-{SELF}').get('AXLabel') == ui.t('rideSettle.paid.due')
assert by_id(ui.read(), 'ride-detail-pay'), 'the pay button is missing'
ui.at_rest()
ui.snap('01-owing')
print('PASS: 已欠 1 天 on the ticket and the card names the scheduled 72 h reminder')
