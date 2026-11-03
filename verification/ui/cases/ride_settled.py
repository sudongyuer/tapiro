"""A fully settled ride for a rider, the next day at 10:05 (218 A, 219 A). The ticket carries the 已结清 stamp, leads
with 「这趟结清了」 and shows Grab 总价 RM 74.00 and 你付了 RM 24.70; the 结清 step reads 2/2 都付了 with 小林 as the
organiser receiving RM 24.60 and 阿明 and you ✓ 已结清. One car sticker card 「一起去了 KLIA2」 names the others and offers
收进贴纸本; tapping it sends collect_sticker once and the card then reads 已收进贴纸本. No pay button remains."""
import json
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from choose import defaults  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from ride import within_screen  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'src/lib/i18n/locales/rideSettle/', 'src/lib/stickers/',
        'supabase/migrations/20261102000900_ride_settle_reads.sql']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'settled']
CALLS = 'uiVerifyRideDetailCalls'
SELF = '00000000-0000-4000-8000-000000000001'
MING = 'fixture-ride-aming'
MONEY = r'RM\s?'

ui = UI(*sys.argv[1:])

ticket = ui.element('ride-detail-ticket').get('AXLabel') or ''
assert ticket.startswith(ui.t('rideSettle.ticket.stamp')), f'the ticket does not carry the stamp: {ticket}'
assert ui.t('rideSettle.ticket.leadDone') in ticket, ticket
assert re.search(re.escape(ui.t('rideSettle.ticket.total')) + r' ' + MONEY + r'74\.00', ticket), ticket
assert re.search(re.escape(ui.t('rideSettle.ticket.youPaid')) + r' ' + MONEY + r'24\.70', ticket), ticket
assert ui.element('ride-detail-settle-title').get('AXLabel') == ui.t('rideSettle.steps.settleDone', total=2)
for member in (MING, SELF):
    paid = ui.element(f'ride-settle-paid-{member}').get('AXLabel')
    assert paid == ui.t('rideSettle.paid.settled'), f'{member} reads {paid}'
items = ui.read()
assert by_id(items, 'ride-detail-pay') is None, 'a settled ride still offers 付给小林'
assert by_id(items, 'ride-detail-dispute') is None, 'a settled ride still offers 金额不对'
stamp = by_id(items, 'ride-detail-stamp-settled')
assert stamp, 'the 已结清 stamp is missing'
card = by_id(items, 'ride-settle-sticker')
assert card, 'the car sticker card is missing'
collect = by_id(items, 'ride-settle-collect')
assert collect and collect.get('AXLabel') == ui.t('rideSettle.sticker.collect'), collect
assert_touch_target(collect, '收进贴纸本')
for identifier in ('ride-detail-ticket', 'ride-settle-sticker'):
    within_screen(items, identifier)
ui.at_rest()
ui.snap('01-settled')

ui.tap('ride-settle-collect')
ui.wait_label('ride-settle-open-book', lambda label: label == ui.t('rideSettle.sticker.collected'),
              'the sticker card never read 已收进贴纸本')
deadline = time.monotonic() + 10
sent = []
while time.monotonic() < deadline:
    text = defaults(ui, CALLS)
    sent = [call for call in (json.loads(text) if text else []) if call['name'] == 'collectSticker']
    if sent:
        break
    time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
assert len(sent) == 1, f'collect_sticker sent {len(sent)} times'
ui.at_rest()
ui.snap('02-collected')
print('PASS: stamped ticket with 你付了, 2/2 rows, one car sticker collected once')
