"""A Grab-split ride at 到了 (217 A). The organiser's bottom reads only 「到了」; tapping it sends reach_ride once, opens
no split sheet, and the ticket is stamped 已结清 with 「到了，一路顺利」 and 车费 在 Grab 里分; the 结清 step reads 在 Grab 里分好了
· 不用在 Tapiro 付 and the car sticker card says 每人一张车贴纸."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/ride/', 'src/lib/i18n/locales/rideSettle/']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans']
BUDGET = 180
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'reachGrab']

ui = UI(*sys.argv[1:])

reach = ui.element('ride-detail-reach')
assert reach.get('AXLabel') == ui.t('rideSettle.footer.reachGrab'), reach.get('AXLabel')
ui.tap('ride-detail-reach')
ui.wait_label('ride-detail-settle-title', lambda label: label == ui.t('rideSettle.steps.settleGrab'),
              'the 结清 step never read 在 Grab 里分好了')
items = ui.read()
assert by_id(items, 'ride-split') is None, 'a Grab-split ride opened the split sheet'
ticket = (by_id(items, 'ride-detail-ticket') or {}).get('AXLabel') or ''
assert ticket.startswith(ui.t('rideSettle.ticket.stamp')), ticket
assert ui.t('rideSettle.ticket.leadGrab') in ticket, ticket
assert by_id(items, 'ride-settle-sticker'), 'the car sticker card is missing'
ui.at_rest()
ui.snap('01-grab-settled')
print('PASS: a Grab-split ride settles at 到了 with stamp and sticker')
