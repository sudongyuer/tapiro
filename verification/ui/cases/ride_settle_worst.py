"""Worst cases for 结清: six riders with 40-character names and RM 1,000.00 (the ride limit) for the organiser, read
as 每人 RM 166.70 / 你出 RM 166.50 with no empty segment in the ticket label; then a rider's view of ¥1,600.00 (the ¥
limit) after paying, whose footer waits on the 40-character organiser name; then a lone rider. No row, button or cell
overflows the screen, the long 「金额不对」 note wraps, and the amounts keep their currency. The pinned footer is an
opaque bar with the system separator along its top, so the cut timeline above it does not read as one more line beside
the 「你说已付」 status (audit S3)."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, luma  # noqa: E402
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
assert re.search(re.escape(ui.t('rideSettle.ticket.each')) + r' RM\s?166\.70', ticket), ticket
assert re.search(re.escape(ui.t('rideSettle.ticket.yours')) + r' RM\s?166\.50', ticket), ticket
assert not re.search(r'[，,]\s*[，,]', ticket), f'the ticket label joins an empty segment: {ticket}'
fits('ride-detail-ticket', 'ride-detail-timeline')
ui.element('ride-settle-dispute-fixture-ride-long-2')
ui.at_rest()
ui.snap('01-six-riders')

relaunch(ui, drop=['-uiVerifyRideDetail', 'settleWorst'], add=['-uiVerifyRideDetail', 'settleCny', '-uiVerifyScene', SCENE],
         ready='ride-detail-ticket')
ticket = ui.element('ride-detail-ticket').get('AXLabel') or ''
assert re.search(r'¥\s?1,?600\.00', ticket), ticket
fits('ride-detail-ticket', 'ride-detail-paid', 'ride-detail-paid-view')
ui.at_rest()
items = ui.read()
lead, ticket = by_id(items, 'ride-detail-lead')['frame'], by_id(items, 'ride-detail-ticket')['frame']
clear = ticket['x'] + ticket['width'] - (lead['x'] + lead['width'])
assert clear >= 64, f'the lead line runs under the car sticker: it ends {clear:.0f} pt from the ticket edge'
shot = ui.snap('02-cny-limit')
bar = by_id(ui.read(), 'ride-detail-footer')['frame']
xs = [x for x in range(24, int(bar['width']) - 24, 6)]
ground = sorted(luma(shot.rgb(x, bar['y'] + 3)) for x in xs)[len(xs) // 2]
rows = [bar['y'] + step / shot.scale for step in range(-2, 3)]
line = min(sorted(luma(shot.rgb(x, y)) for x in xs)[len(xs) // 2] for y in rows)
print(f'footer: bar {ground:.0f}, darkest row at its top {line:.0f}')
assert ground - line >= 10, f'no separator along the top of the footer bar: {line:.0f} against the bar {ground:.0f}'

relaunch(ui, drop=['-uiVerifyRideDetail', 'settleCny'], add=['-uiVerifyRideDetail', 'settleOne', '-uiVerifyScene', SCENE],
         ready='ride-detail-ticket')
assert ui.element('ride-detail-settle-title').get('AXLabel') == ui.tn('rideSettle.steps.settleConfirm', 1)
ui.at_rest()
ui.snap('03-one-rider')
print('PASS: six long names, both currency limits and one rider fit')
