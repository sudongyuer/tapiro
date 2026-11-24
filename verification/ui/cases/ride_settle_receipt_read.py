"""小貘 reads the Grab receipt into the split (ride.split.receipt). With a receipt attached the sheet offers 「让小貘读总价」
and says it uses 小貘体力. Before any consent, the tap closes the sheet and opens the consent page; nothing is sent until
同意. The first reading finds no total: the reopened sheet says so, keeps the total empty and offers the button again.
The second tap shows progress in the sheet, then fills RM 74.00, splits it 24.70 / 24.70 / 24.60, names what was read
and drops the button. Each tap sends read_receipt once with the image, and 发给 sends the read total."""
import json
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import ai_calls, assert_calls  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from ride import tap_bar  # noqa: E402

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
ui.tap('ride-split-receipt-add')
ui.element('ride-split-receipt-added')
read = ui.element('ride-split-read')
assert read.get('AXLabel') == ui.t('rideSettle.sheet.read.button'), read.get('AXLabel')
assert_touch_target(read, '让小貘读总价')
assert ui.t('rideSettle.sheet.read.offer') in receipt_footer(), receipt_footer()
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
ui.wait(lambda items: ui.t('rideSettle.sheet.read.unreadable') in
        ((by_id(items, 'ride-split-receipt-picked') or {}).get('AXLabel') or ''), 'the sheet never said nothing was read')
assert (ui.element('ride-split-total').get('AXValue') or '') in ('', ui.t('rideSettle.sheet.placeholder'))
ui.element('ride-split-read')
ui.at_rest()
ui.snap('03-unreadable')

ui.tap('ride-split-read')
busy = ui.element('ride-split-read-busy')
assert ui.t('rideSettle.sheet.read.reading') in (busy.get('AXLabel') or ''), busy.get('AXLabel')
ui.snap('04-reading')
ui.wait(lambda items: (by_id(items, 'ride-split-total') or {}).get('AXValue') == '74.00', 'the total was never filled')
ui.wait(lambda items: (by_id(items, f'ride-split-share-{MING}') or {}).get('AXValue') == '24.70',
        '阿明 never read 24.70')
# 小雅's row sits below the medium detent; your RM 24.60 can only follow from 74.00 with both riders at 24.70, and the
# sent split below checks 小雅's share.
assert re.search(MONEY + r'24\.60', ui.element('ride-split-organiser').get('AXLabel') or '')
assert re.search(ui.pattern('rideSettle.sheet.read.filled', amount=MONEY + r'74\.00'), receipt_footer()), \
    receipt_footer()
items = ui.read()
assert not by_id(items, 'ride-split-read'), 'the read button stayed after the total was filled'
assert not by_id(items, 'ride-split-read-busy'), 'progress stayed after the total was filled'
assert len(assert_calls(ui, 'read_receipt', 2)) == 2
ui.at_rest()
ui.snap('05-filled')

tap_bar(ui, 'ride-split-confirm')
ui.gone('ride-split')
sent = sent_splits(1)[0]
assert sent['totalMinor'] == 7400, sent
assert sorted((s['memberId'], s['minor']) for s in sent['shares']) == [(MING, 2470), (YA, 2470)], sent
assert sent['receipt'], f'the receipt was not sent: {sent}'
print('PASS: consent first, an unreadable receipt leaves the total to you, a read one fills it and the split sends it')
