"""Worst case in the create flow (break-ui): two 80-character places with 8-character short names, 6 people, ¥1600, 9
large bags and a 140-character meeting note keep the live ticket inside the screen at its fixed height, the 6-seat hint
shows, the flight picker and the ticket read the same flight clock in the device zone (234, run in London), and the
confirm rows stay inside the sheet, in zh-Hans and ms."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
import ocr  # noqa: E402
from driver import UI, luma  # noqa: E402
from ride import form_scroll_to, open_form, open_list, picker_clock, within_screen  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/ride-create/', 'verification/ui/ride.py', 'verification/ui/ocr.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDraft', 'worst']
TIME_ZONE = 'Europe/London'

INK = 60
ICON_GAP = 6


# In dark Vision takes the row's start dot into a line's box (up to 9 pt) or reads it as a line of its own (2026-11-18), so the
# line's first ink column is measured instead, right of the dot.
def ink_start(shot, row, line):
    y = line['y'] + line['height'] / 2
    ground = luma(shot.rgb(row['x'] + row['width'] - 2, y))
    step = 1 / shot.scale
    x = row['x'] - ICON_GAP
    while x < row['x'] + 40:
        if any(abs(luma(shot.rgb(x, line['y'] + line['height'] * k / 8)) - ground) > INK for k in range(1, 8)):
            return round(x, 1)
        x += step
    return None


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
lines = sorted((line for line in ocr.lines_in(shot, ui.locale)
                if row['y'] <= line['y'] + line['height'] / 2 <= row['y'] + row['height']
                and line['x'] + line['width'] > row['x'] + 40), key=lambda line: line['y'])
name = [line for i, line in enumerate(lines) if i == 0 or line['y'] - lines[i - 1]['y'] > 8][:2]
assert len(name) == 2, f'the start place should read on two lines: {[line["text"] for line in lines]}'
starts = [ink_start(shot, row, line) for line in name]
assert None not in starts and abs(starts[0] - starts[1]) <= 2, \
    f'the two-line place name is not left-aligned: {list(zip((line["text"] for line in name), starts))}'
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
