"""小貘 reads the Grab receipt into the split (ride.split.receipt). With a receipt attached the sheet offers 「让小貘读总价」
below the rider rows and says it uses 小貘体力, in a paragraph of its own under the privacy note. Before any consent,
the tap closes the sheet and opens the consent page; nothing is sent until 同意. The first reading finds no total: the
reopened sheet says so under the total, keeps the total empty and offers the button again. The second tap shows
progress in the sheet, then fills RM 74.00, splits it 24.70 / 24.70 / 24.60 and drops the button; reopened at the
medium detent, the sheet names what was read under the total, apart from the receipt's privacy note, with every rider
row in view. Each tap sends read_receipt once with the image, and 发给 sends the read total."""
import json
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import ai_calls, assert_calls  # noqa: E402
from board import screen  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from ride import form_scroll_to, tap_bar  # noqa: E402

DEPS = ['src/features/ride/detail/', 'src/app/(tabs)/ride/', 'src/features/ask/receiptReader.ts',
        'src/features/ask/useReceiptReader.ts', 'src/features/ask/fixtureAskReplies.ts', 'src/features/ask/screenshot.ts',
        'src/lib/drafts/receiptDraft.ts', 'src/app/ask-consent.tsx', 'src/lib/i18n/locales/rideSettle/']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'reach',
        '-uiVerifyAiConsent', 'none', '-uiVerifyAiReplies', 'receiptUnreadable,answer', '-uiVerifyAiDelayMs', '2500']
MING, YA = 'fixture-ride-aming', 'fixture-ride-xiaoya'
MONEY = r'RM\s?'

ui = UI(*sys.argv[1:])


def receipt_footer():
    return ui.element('ride-split-receipt-picked').get('AXLabel') or ''


def read_note(items):
    return (by_id(items, 'ride-split-read-note') or {}).get('AXLabel') or ''


def rows_in_view(items):
    bottom = screen(items)['height']
    for identifier in ('ride-split-total', 'ride-split-read-note', 'ride-split-organiser', f'ride-split-share-{MING}',
                       f'ride-split-share-{YA}'):
        found = by_id(items, identifier)
        assert found and found['frame']['y'] + found['frame']['height'] <= bottom, f'{identifier} is below the sheet'


def sent_splits(count, timeout=15):
    deadline = time.monotonic() + timeout
    found = []
    while time.monotonic() < deadline:
        text = defaults(ui, 'uiVerifyRideDetailCalls')
        found = [call['args'] for call in (json.loads(text) if text else []) if call['name'] == 'sendSplit']
        if len(found) >= count:
            break
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
    assert len(found) == count, f'sendSplit sent {len(found)} times, expected {count}'
    return found


ui.element('ride-detail-reach')
ui.tap('ride-detail-reach')
ui.element('ride-split')
items = ui.read()
assert not by_id(items, 'ride-split-read'), 'the read button shows before a receipt is attached'
form_scroll_to(ui, 'ride-split-receipt-add', container='ride-split')
ui.tap('ride-split-receipt-add')
ui.element('ride-split-receipt-added')
read = ui.element('ride-split-read')
assert read.get('AXLabel') == ui.t('rideSettle.sheet.read.button'), read.get('AXLabel')
assert_touch_target(read, '让小貘读总价')
assert receipt_footer() == f"{ui.t('rideSettle.sheet.receiptOptional')}\n\n{ui.t('rideSettle.sheet.read.offer')}", \
    receipt_footer()
ui.at_rest()
ui.snap('01-offer')

ui.tap('ride-split-read')
ui.element('ask-consent-screen', timeout=30)
ui.gone('ride-split')
assert ai_calls(ui, 'read_receipt', 1, timeout=1) == [], 'the receipt left the phone before 同意'
ui.at_rest()
ui.capture('02-consent')
ui.tap('ask-consent-agree')
ui.gone('ask-consent-screen', timeout=30)
first = assert_calls(ui, 'read_receipt', 1)
assert first == [{'text': '', 'image': True}], first

ui.tap('ride-detail-split')
ui.element('ride-split')
ui.wait(lambda items: read_note(items) == ui.t('rideSettle.sheet.read.unreadable'),
        'the sheet never said nothing was read under the total')
assert (ui.element('ride-split-total').get('AXValue') or '') in ('', ui.t('rideSettle.sheet.placeholder'))
ui.at_rest()
ui.snap('03-unreadable')

form_scroll_to(ui, 'ride-split-read', container='ride-split')
assert ui.t('rideSettle.sheet.read.unreadable') not in receipt_footer(), receipt_footer()
ui.tap('ride-split-read')
busy = ui.element('ride-split-read-busy')
assert ui.t('rideSettle.sheet.read.reading') in (busy.get('AXLabel') or ''), busy.get('AXLabel')
ui.snap('04-reading')
ui.wait(lambda items: (by_id(items, 'ride-split-total') or {}).get('AXValue') == '74.00', 'the total was never filled')
ui.wait(lambda items: (by_id(items, f'ride-split-share-{MING}') or {}).get('AXValue') == '24.70',
        '阿明 never read 24.70')
items = ui.read()
assert not by_id(items, 'ride-split-read'), 'the read button stayed after the total was filled'
assert not by_id(items, 'ride-split-read-busy'), 'progress stayed after the total was filled'
assert receipt_footer() == ui.t('rideSettle.sheet.receiptOptional'), receipt_footer()
assert len(assert_calls(ui, 'read_receipt', 2)) == 2

tap_bar(ui, 'ride-split-cancel')
ui.gone('ride-split')
ui.tap('ride-detail-split')
ui.element('ride-split')
ui.at_rest()
items = ui.read()
assert re.fullmatch(ui.pattern('rideSettle.sheet.read.filled', amount=MONEY + r'74\.00'), read_note(items)), \
    read_note(items)
assert by_id(items, 'ride-split-total').get('AXValue') == '74.00'
assert by_id(items, f'ride-split-share-{MING}').get('AXValue') == '24.70'
assert by_id(items, f'ride-split-share-{YA}').get('AXValue') == '24.70'
assert re.search(MONEY + r'24\.60', by_id(items, 'ride-split-organiser').get('AXLabel') or '')
rows_in_view(items)
ui.snap('05-filled')

tap_bar(ui, 'ride-split-confirm')
ui.gone('ride-split')
sent = sent_splits(1)[0]
assert sent['totalMinor'] == 7400, sent
assert sorted((s['memberId'], s['minor']) for s in sent['shares']) == [(MING, 2470), (YA, 2470)], sent
assert sent['receipt'], f'the receipt was not sent: {sent}'
print('PASS: consent first, an unreadable receipt leaves the total to you, a read one fills it and the split sends it')
