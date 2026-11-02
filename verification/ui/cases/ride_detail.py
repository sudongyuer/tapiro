"""Ride detail for a non-member and an organiser (186 A–192 A). A non-member sees the full 椰糖杏 ticket with 双威 → KLIA2,
the 集合 / 座位 / 每人约 cells and the airport cells (航班起飞 09:10, 2 件大行李), the six-step timeline with 「现在」 at
凑齐, the organiser 小林 · 靠谱, the organiser's seat plus a filled and a dashed seat (members hidden, 188 A), the privacy
line and 申请上车. 申请上车 opens the note sheet; 申请 sends request_ride once, the ticket gets the 已申请 stamp and the
bottom reads 等小林通过 with 撤回申请 (192 A); 撤回申请 asks first and withdraws. The organiser of the same ride sees the
application card with 阿杰's note and 通过 / 拒绝 (189 A); 通过 sends decide_ride_request once, the card goes and the
ride reads 3/3. Scrolling the ticket away puts 「双威 → KLIA2」 in the nav bar (186 A)."""
import json
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch, tap_sheet_action  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from ride import assert_ticket_colour, within_screen  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py', 'src/features/block/',
        'src/ui/PillButton.tsx', 'src/ui/SyncedTextField.tsx', 'supabase/migrations/20261102000700_ride_detail.sql']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'viewer']
CALLS = 'uiVerifyRideDetailCalls'
ROUTE = '双威 → KLIA2'

ui = UI(*sys.argv[1:])


def calls(name):
    text = defaults(ui, CALLS)
    return [call for call in (json.loads(text) if text else []) if call['name'] == name]


def wait_calls(name, count, timeout=15):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if len(calls(name)) >= count:
            break
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
    assert len(calls(name)) == count, f'{name} sent {len(calls(name))} times, expected {count}'


def ticket_label():
    return ui.element('ride-detail-ticket').get('AXLabel') or ''


ticket = ui.element('ride-detail-ticket')
text = ticket_label()
for part in (ROUTE, ui.t('ride.ticket.flight', time='09:10'), ui.tn('ride.ticket.bags', 2)):
    assert part in text, f'ticket label misses {part!r}: {text}'
assert text.startswith(ui.tn('ride.ticket.need', 1)), text
seats = ui.element('ride-detail-seats')
assert seats.get('AXLabel') == ui.t('ride.detail.seatsA11y', name='小林', taken=2, empty=1), seats.get('AXLabel')
organiser = ui.element('ride-detail-organiser')
assert organiser.get('AXLabel') == ui.t('ride.detail.steps.by', name='小林', tier=ui.t('bounty.tier.reliable')), \
    organiser.get('AXLabel')
settle = ui.element('ride-detail-settle-line').get('AXLabel') or ''
assert re.fullmatch(ui.pattern('ride.detail.steps.settleTapiro', amount=r'RM\s?25'), settle), settle
apply = ui.element('ride-detail-apply')
assert apply.get('AXLabel') == ui.t('ride.detail.apply.action'), apply.get('AXLabel')
assert_touch_target(apply, '申请上车')
items = ui.read()
for identifier in ('ride-detail-ticket', 'ride-detail-apply'):
    within_screen(items, identifier)
assert by_id(items, 'ride-detail-arrivals') is None, 'a non-member must not see the arrival row'
shot = ui.snap('01-viewer')
assert_ticket_colour(ui, shot, ticket, '--color-ride', 'detail ticket')

ui.tap('ride-detail-apply')
ui.element('ride-apply')
ui.tap('ride-apply-confirm')
ui.gone('ride-apply')
ui.wait_label('ride-detail-applied', lambda label: label == ui.t('ride.detail.applied.waiting', name='小林'),
              '等小林通过 never showed')
assert ticket_label().startswith(ui.t('ride.detail.applied.stamp')), ticket_label()
withdraw = ui.element('ride-detail-withdraw')
assert withdraw.get('AXLabel') == ui.t('ride.detail.applied.withdraw'), withdraw.get('AXLabel')
wait_calls('request', 1)
ui.at_rest()
ui.capture('02-applied')

ui.tap('ride-detail-withdraw')
ui.labelled(ui.t('ride.detail.applied.confirmTitle'))
tap_sheet_action(ui, ui.t('ride.detail.applied.confirm'), 'ride-detail-withdraw')
ui.element('ride-detail-apply')
wait_calls('withdraw', 1)
assert not ticket_label().startswith(ui.t('ride.detail.applied.stamp')), ticket_label()

relaunch(ui, drop=['-uiVerifyRideDetail', 'viewer'],
         add=['-uiVerifyRideDetail', 'organiser', '-uiVerifyScene', SCENE], ready='ride-detail-ticket')
name = ui.element('ride-detail-request-name-fixture-ride-ajie')
assert name.get('AXLabel') == ui.t('ride.detail.requests.a11y', name='阿杰', tier=ui.t('bounty.tier.new_friend'),
                                   note='我有 1 个 24 寸箱子，可以吗？'), name.get('AXLabel')
for identifier, key in (('ride-detail-approve-fixture-ride-ajie', 'approve'),
                        ('ride-detail-decline-fixture-ride-ajie', 'decline')):
    button = ui.element(identifier)
    assert button.get('AXLabel') == ui.t(f'ride.detail.requests.{key}'), button.get('AXLabel')
    assert_touch_target(button, key)
assert ticket_label().startswith(ui.tn('ride.ticket.requests', 1)), ticket_label()
ui.at_rest()
ui.capture('03-organiser')
ui.tap('ride-detail-approve-fixture-ride-ajie')
ui.gone('ride-detail-approve-fixture-ride-ajie')
wait_calls('decide', 1)
ui.wait_label('ride-detail-ticket', lambda label: '3/3' in label, 'the ride never read 3/3 after 通过')

f = ui.element('ride-detail')['frame']
for _ in range(3):
    ui.swipe((f['x'] + f['width'] / 2, f['y'] + f['height'] * 0.8), (f['x'] + f['width'] / 2, f['y'] + f['height'] * 0.3))
    if any(i.get('AXLabel') == ROUTE and i.get('type') in ('Heading', 'StaticText') for i in ui.read()):
        break
ui.wait(lambda items: any(i.get('AXLabel') == ROUTE and i.get('AXUniqueId') != 'ride-detail-ticket'
                          for i in items), 'the nav bar never showed 双威 → KLIA2 after scrolling')
ui.at_rest()
ui.capture('04-scrolled')
print('PASS: non-member ticket, seats and 申请上车, 已申请 and 撤回, application card, 通过 and the scrolled title')
