"""Worst case in the create flow (break-ui): two 80-character places with 8-character short names, 6 people, ¥1600, 9
large bags and a 140-character meeting note keep the live ticket inside the screen at its fixed height, the 6-seat hint
shows, the flight picker and the ticket read the same flight clock in the device zone (234, run in London), and the
confirm rows stay inside the sheet, in zh-Hans and ms."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
import ocr  # noqa: E402
from datepicker import picker_value  # noqa: E402
from driver import UI, picker_time, plain  # noqa: E402
from ride import form_scroll_to, open_form, open_list, within_screen  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/ride-create/', 'verification/ui/ride.py', 'verification/ui/ocr.py',
        'verification/ui/datepicker.py']
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
ui.at_rest()
shot = ui.snap('01-form-top')
row = ui.element('ride-form-start')['frame']
# Vision sometimes reads the row's ○ marker into the second line's box, which then starts left of the row; text cannot
# start there, so such a box is clamped to the row's edge and a right-shifted line still counts as drift.
lines = [{**line, 'x': max(line['x'], row['x'])} for line in ocr.lines_in(shot, ui.locale)
         if row['y'] <= line['y'] + line['height'] / 2 <= row['y'] + row['height']
         and line['x'] + line['width'] > row['x'] and line['x'] < row['x'] + row['width']]
name = sorted(lines, key=lambda line: line['y'])[:2]
assert len(name) == 2, f'the start place should read on two lines: {[line["text"] for line in lines]}'
drift = abs(name[0]['x'] - name[1]['x'])
assert drift <= 4, f'the two-line place name is not left-aligned: {[(line["text"], round(line["x"])) for line in name]}'
form_scroll_to(ui, 'ride-form-seats-label')
ui.wait_label('ride-form-seats-label', lambda label: ui.t('ride.create.form.sixSeats', count=5) in label,
              'the 6-seat hint is missing')
form_scroll_to(ui, 'ride-form-flight')
# Read as the picker writes it, so the check holds in either hour cycle (晚上11:55 or 23:55).
flight = picker_time(ui.wait(lambda items: picker_value(items, 'ride-form-flight'), 'the flight picker has no value'))
assert plain(ui.t('ride.ticket.flight', time=flight)) in plain(ui.element('ride-form-ticket').get('AXLabel')), \
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
