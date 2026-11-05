"""The same rider still owing, opening the ride at 03:00 or 04:00 (216 A). The 24 h reminder falls in quiet hours
(23:00 to 08:00), so the app defers it to 08:00 today instead of dropping it: both reminders are scheduled and the card
names the 24 h one, 「Tapiro 会在 今天 08:00 提醒你」, in the device zone (step 7, 234)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from ride import clock_of, wait_owe_reminder  # noqa: E402

DEPS = ['src/features/ride/', 'src/lib/i18n/locales/rideSettle/', 'src/lib/notifications/', 'verification/ui/ride.py']
SCENE = 'ride-detail'
LOCAL_HOURS = [3, 4]
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'owing']

ui = UI(*sys.argv[1:])

assert ui.element('ride-settle-owe'), 'the owing card is missing'
pay = wait_owe_reminder(ui, ['ride.pay24', 'ride.pay72'])
assert clock_of(pay[0]['at']) == '08:00', f'the 24 h reminder is not deferred to 08:00: {clock_of(pay[0]["at"])}'
ui.at_rest()
ui.snap('01-deferred')
print('PASS: the 24 h reminder in quiet hours is deferred to 08:00 today and the card names it')
