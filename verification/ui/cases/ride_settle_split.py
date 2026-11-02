"""到了 and the split sheet for the organiser (210 A, 211 A, 212 B, 220 A). On the way the ticket reads 车上 and the
到了 step asks 「到了？」; the bottom has only 「到了 · 分车费」. Tapping it sends reach_ride once and opens the half sheet
「到了 · 分车费」 with the Grab total, the optional receipt row and one row per person. Typing 74 splits RM 74.00 three
ways: 阿明 and 小雅 RM 24.70, 小林 (you) RM 24.60, and the footer says the extra RM 0.10 is yours. Raising 阿明 above the
total blocks sending (220 A); setting 阿明 to 20 keeps 小雅 at 24.70 and moves your row to RM 29.30. Sending posts
send_ride_split once with the attached receipt and the edited shares, and the timeline moves to 结清."""
import json
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import erase, typed  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from ride import assert_ticket_colour, tap_bar  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py', 'src/lib/i18n/locales/rideSettle/',
        'supabase/migrations/20261102000900_ride_settle_reads.sql']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'reach']
CALLS = 'uiVerifyRideDetailCalls'
MING, YA = 'fixture-ride-aming', 'fixture-ride-xiaoya'
MONEY = r'RM\s?'

ui = UI(*sys.argv[1:])


def calls(name, count, timeout=15):
    deadline = time.monotonic() + timeout
    found = []
    while time.monotonic() < deadline:
        text = defaults(ui, CALLS)
        found = [call for call in (json.loads(text) if text else []) if call['name'] == name]
        if len(found) >= count:
            break
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
    assert len(found) == count, f'{name} sent {len(found)} times, expected {count}'
    return found


def footer():
    return ui.element('ride-split-footer').get('AXLabel') or ''


ticket = ui.element('ride-detail-ticket')
assert (ticket.get('AXLabel') or '').startswith(ui.t('rideSettle.ticket.onboard')), ticket.get('AXLabel')
assert ui.element('ride-detail-arrive-title').get('AXLabel') == ui.t('rideSettle.steps.ask')
reach = ui.element('ride-detail-reach')
assert reach.get('AXLabel') == ui.t('rideSettle.footer.reach'), reach.get('AXLabel')
assert_touch_target(reach, '到了 · 分车费')
ui.at_rest()
shot = ui.snap('01-on-the-way')
assert_ticket_colour(ui, shot, ticket, '--color-ride', 'ticket on the way')

ui.tap('ride-detail-reach')
ui.element('ride-split')
calls('reach', 1)
assert footer() == ui.t('rideSettle.sheet.footerEmpty'), footer()
items = ui.read()
assert by_id(items, 'ride-split-receipt-add'), 'the receipt row is missing'
assert by_id(items, 'ride-split-receipt-none'), 'the receipt footer is missing'
typed(ui, 'ride-split-total', '74')
ui.wait(lambda items: (by_id(items, f'ride-split-share-{MING}') or {}).get('AXValue') == '24.70',
        '阿明 never read 24.70')
assert (ui.element(f'ride-split-share-{YA}').get('AXValue')) == '24.70'
organiser = ui.element('ride-split-organiser').get('AXLabel') or ''
assert re.search(MONEY + r'24\.60', organiser), organiser
assert re.fullmatch(ui.pattern('rideSettle.sheet.footerEqual', count='3', amount=MONEY + r'0\.10') + r'\n.*', footer(),
                    re.S), footer()
ui.tap('ride-split-receipt-add')
ui.element('ride-split-receipt-added')
ui.at_rest()
ui.snap('02-sheet-equal')

erase(ui, f'ride-split-share-{MING}')
typed(ui, f'ride-split-share-{MING}', '60')
ui.wait(lambda items: (by_id(items, 'ride-split-footer') or {}).get('AXLabel') == ui.t('rideSettle.sheet.overTotal'),
        'riders above the total did not block sending')
send = [i for i in ui.read() if i.get('AXUniqueId') == 'ride-split-confirm' and i.get('type') == 'Button']
assert send and all(i.get('enabled') is False for i in send), f'发给 is still enabled above the total: {send}'
erase(ui, f'ride-split-share-{MING}')
typed(ui, f'ride-split-share-{MING}', '20')
ui.wait(lambda items: re.search(MONEY + r'29\.30', (by_id(items, 'ride-split-organiser') or {}).get('AXLabel') or ''),
        'your row did not take the remainder')
assert ui.element(f'ride-split-share-{YA}').get('AXValue') == '24.70', 'editing 阿明 moved 小雅'
assert footer().startswith(ui.t('rideSettle.sheet.footerEdited')), footer()
ui.at_rest()
ui.snap('03-sheet-edited')

tap_bar(ui, 'ride-split-confirm')
ui.gone('ride-split')
sent = calls('sendSplit', 1)[0]['args']
assert sent['totalMinor'] == 7400, sent
assert sorted((s['memberId'], s['minor']) for s in sent['shares']) == [(MING, 2000), (YA, 2470)], sent
assert sent['receipt'], f'the receipt was not sent: {sent}'
assert len(calls('uploadReceipt', 1)) == 1
ui.wait_label('ride-detail-settle-title',
              lambda label: label == ui.t('rideSettle.steps.settleCount', received=0, total=2),
              'the timeline never moved to 结清')
ui.at_rest()
ui.snap('04-sent')
print('PASS: 到了 opens the split sheet, equal rows round up, 220 A blocks and remainders, one send with the receipt')
