"""Worst cases for 结清: six riders with 40-character names and RM 1,000.00 (the ride limit) for the organiser, then a
rider's view of ¥1,600.00 (the ¥ limit), then a lone rider. No row, button or cell overflows the screen, the long
「金额不对」 note wraps, and the amounts keep their currency."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI  # noqa: E402
from ride import within_screen  # noqa: E402

DEPS = ['src/features/ride/', 'src/lib/i18n/locales/rideSettle/']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'settleWorst']

ui = UI(*sys.argv[1:])


def fits(*identifiers):
    items = ui.read()
    for identifier in identifiers:
        within_screen(items, identifier)


ticket = ui.element('ride-detail-ticket').get('AXLabel') or ''
assert re.search(r'RM\s?1,?000\.00', ticket), ticket
fits('ride-detail-ticket', 'ride-detail-timeline')
ui.element('ride-settle-dispute-fixture-ride-long-2')
ui.at_rest()
ui.snap('01-six-riders')

relaunch(ui, drop=['-uiVerifyRideDetail', 'settleWorst'], add=['-uiVerifyRideDetail', 'settleCny', '-uiVerifyScene', SCENE],
         ready='ride-detail-ticket')
ticket = ui.element('ride-detail-ticket').get('AXLabel') or ''
assert re.search(r'¥\s?1,?600\.00', ticket), ticket
fits('ride-detail-ticket', 'ride-detail-pay')
ui.at_rest()
ui.snap('02-cny-limit')

relaunch(ui, drop=['-uiVerifyRideDetail', 'settleCny'], add=['-uiVerifyRideDetail', 'settleOne', '-uiVerifyScene', SCENE],
         ready='ride-detail-ticket')
assert ui.element('ride-detail-settle-title').get('AXLabel') == ui.tn('rideSettle.steps.settleConfirm', 1)
ui.at_rest()
ui.snap('03-one-rider')
print('PASS: six long names, both currency limits and one rider fit')
