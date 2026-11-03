"""A tap on a recorded notification routes on a cold start (spec, Tap routing): the verify build replaces the
notification response at its boundary with `-uiVerifyNoticeTap <kind>:<id>`, the same `{kind, id}` the server puts under
`body`. bounty.selected opens the 7A status page for that bounty over home; bounty.applied opens the 挑人 screen;
payment.marked_paid opens the pay sheet for that payment; ride.approved opens the ride detail; chat.message opens the 消息
tab until the chat screens exist. A relaunch without the
argument stays on home, so the routing is read once."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/lib/notifications/', 'src/app/(tabs)/_layout.tsx', 'src/features/bounty/status/',
        'src/features/bounty/select/', 'src/features/payment/', 'src/features/ride/detail/', 'src/app/(tabs)/messages/', 'verification/ui/bounty.py']
BUDGET = 300
TAP = ['-uiVerifyNoticeTap', 'bounty.selected:fixture-bounty-01']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyRole', 'helper', '-uiVerifyNoticeTap', 'bounty.selected:fixture-bounty-01']

ui = UI(*sys.argv[1:])

ui.element('bounty-status', timeout=60)
ui.settled(lambda items: by_id(items, 'bounty-status-step-selected'), 'the status page never loaded its timeline')
ui.at_rest()
ui.capture('01-bounty-selected')

relaunch(ui, drop=TAP, add=['-uiVerifyNoticeTap', 'bounty.applied:fixture-bounty-01'], ready='bounty-applicants')
ui.capture('02-bounty-applied')

relaunch(ui, drop=TAP, add=['-uiVerifyNoticeTap', 'payment.marked_paid:fixture-owed'], ready='pay-sheet')
ui.at_rest()
ui.capture('03-payment-marked-paid')

relaunch(ui, drop=TAP, add=['-uiVerifyNoticeTap', 'ride.approved:ride-tap'], ready='ride-detail')
ui.capture('04-ride-approved')

relaunch(ui, drop=TAP, add=['-uiVerifyNoticeTap', 'chat.message:thread-tap'], ready='messages-empty')
ui.capture('05-chat-message')

relaunch(ui, drop=TAP)
ui.at_rest()
items = ui.read()
for screen in ('bounty-status', 'bounty-applicants', 'pay-sheet', 'ride-detail', 'messages-empty'):
    assert by_id(items, screen) is None, f'{screen} opened again without a notification'
print('PASS: bounty.selected, bounty.applied, payment.marked_paid, ride.approved and chat.message each route from a cold-start tap')
