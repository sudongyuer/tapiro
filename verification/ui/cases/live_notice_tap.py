"""Tap routing on a cold start (spec, Tap routing). `xcrun simctl push` cannot tap a banner, so the verify build replaces
the last notification response at its boundary with `-uiVerifyNoticeTap <kind>:<id>`, the `{kind, id}` the server puts
under `body`; the case proves the routing from that response, not the system's delivery. Each launch waits for an
element that exists only once the target has loaded: bounty.selected opens the 7A status page with its timeline;
bounty.applied opens the 挑人 screen with its applicants; payment.marked_paid opens the pay sheet with its amount;
ride.approved opens the ride detail of the fixture ride ride-airport with its ticket; chat.message opens the 消息 tab
until the chat screens exist. A relaunch without the argument stays on home, so the response is read once."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/lib/notifications/', 'src/app/(tabs)/_layout.tsx', 'src/features/bounty/status/',
        'src/features/bounty/select/', 'src/features/payment/', 'src/features/ride/detail/', 'src/app/(tabs)/messages/',
        'verification/ui/bounty.py']
BUDGET = 300
TAP = ['-uiVerifyNoticeTap', 'bounty.selected:fixture-bounty-01']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyRole', 'helper', '-uiVerifyNoticeTap', 'bounty.selected:fixture-bounty-01']

ui = UI(*sys.argv[1:])

ui.element('bounty-status-step-selected', timeout=60)
ui.at_rest()
ui.capture('01-bounty-selected')

relaunch(ui, drop=TAP, add=['-uiVerifyNoticeTap', 'bounty.applied:fixture-bounty-01'],
         ready='bounty-applicant-fixture-applicant-jie')
ui.capture('02-bounty-applied')

relaunch(ui, drop=TAP, add=['-uiVerifyNoticeTap', 'payment.marked_paid:fixture-owed'], ready='pay-amount')
ui.at_rest()
ui.capture('03-payment-marked-paid')

relaunch(ui, drop=TAP, add=['-uiVerifyNoticeTap', 'ride.approved:ride-airport'], ready='ride-detail-ticket')
ui.capture('04-ride-approved')

relaunch(ui, drop=TAP, add=['-uiVerifyNoticeTap', 'chat.message:thread-tap'], ready='chat-list')
ui.capture('05-chat-message')

relaunch(ui, drop=TAP)
ui.at_rest()
items = ui.read()
for screen in ('bounty-status', 'bounty-applicants', 'pay-sheet', 'ride-detail', 'chat-list'):
    assert by_id(items, screen) is None, f'{screen} opened again without a notification'
print('PASS: bounty.selected, bounty.applied, payment.marked_paid, ride.approved and chat.message each route from a cold-start tap')
