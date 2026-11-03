"""Worst case in the create flow (break-ui): two 80-character places with 8-character short names, 6 people, ¥1600, 9
large bags and a 140-character meeting note keep the live ticket inside the screen at its fixed height, the 6-seat hint
shows, the flight picker and the ticket read the same flight clock in the device zone (234, run in London), and the
confirm rows stay inside the sheet, in zh-Hans and ms."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from ride import form_scroll_to, open_form, open_list, picker_clock, within_screen  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/ride-create/', 'verification/ui/ride.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDraft', 'worst']
TIME_ZONE = 'Europe/London'

ui = UI(*sys.argv[1:])
open_list(ui)
open_form(ui)
ticket = ui.wait_label('ride-form-ticket', lambda label: '谷中城北庭正门口 → 吉隆坡第二机场站' in label,
                       'the worst short names are not on the ticket')
height = ticket['frame']['height']
assert '¥' in ticket.get('AXLabel', '') and '267' in ticket.get('AXLabel', ''), ticket.get('AXLabel')
within_screen(ui.read(), 'ride-form-ticket')
ui.capture('01-form-top')
form_scroll_to(ui, 'ride-form-seats-label')
ui.wait_label('ride-form-seats-label', lambda label: ui.t('ride.create.form.sixSeats', count=5) in label,
              'the 6-seat hint is missing')
form_scroll_to(ui, 'ride-form-flight')
flight = picker_clock(ui, 'ride-form-flight')
assert ui.t('ride.ticket.flight', time=flight) in (ui.element('ride-form-ticket').get('AXLabel') or ''), \
    f'the flight picker shows {flight}, the ticket does not'
form_scroll_to(ui, 'ride-form-note')
assert abs(ui.element('ride-form-ticket')['frame']['height'] - height) < 1, 'the live ticket changed height'
ui.capture('02-form-bottom')
ui.tap_label(ui.t('ride.create.next'))
ui.element('ride-confirm')
items = ui.read()
for identifier in ('ride-confirm-ticket', 'ride-confirm-note', 'ride-confirm-estimate'):
    within_screen(items, identifier)
ui.capture('03-confirm')
print('PASS: worst draft fits the live ticket, form and confirm')
