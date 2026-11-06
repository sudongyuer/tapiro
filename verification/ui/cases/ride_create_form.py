"""The form under the live ticket (200 A–205 A): 从哪出发 and 去哪 come from the place search with 「票上叫「双威」 · 自动」
(201 A); KLIA2 as the destination opens 航班和行李 by itself (205 A); a quick time shows 「hh:mm 起集合 · 出发前 30
分钟」 (203 A); at 6 people the line reads 「还要 5 人 · 记得叫 6 座的车」 (202 A); typing the whole-ride estimate updates
每人约 on the ticket and the footer (204 A) while the ticket keeps its height. The date picker and the ticket show the
same clock in the device zone (234): run in London, the first quick time is the London clock. 下一步 opens 确认发布."""
import math
import re
import sys
import time
from datetime import datetime

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, token  # noqa: E402
from readable import assert_label_reads  # noqa: E402
from ride import form_scroll_to, open_form, open_list, picker_clock, step  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/ride-create/', 'src/features/place/', 'verification/ui/ride.py', 'verification/ui/readable.py',
        'src/ui/FieldRow.tsx', 'src/ui/SyncedTextField.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyPlaces', 'ride']
TIME_ZONE = 'Europe/London'

ui = UI(*sys.argv[1:])
HALF_HOUR = 30 * 60


def first_quick_time(at):
    return datetime.fromtimestamp(math.ceil((at + HALF_HOUR) / HALF_HOUR) * HALF_HOUR).strftime('%H:%M')


def pick_place(row, query, title):
    ui.tap(row)
    ui.element('place-search')
    ui.type(query)
    result = ui.wait(lambda items: next((i for i in items if (i.get('AXUniqueId') or '').startswith('place-search-result-')
                                         and title in (i.get('AXLabel') or '')), None), f'{title} is not listed')
    ui.tap(result['AXUniqueId'])
    ui.element('ride-form')


open_list(ui)
open_form(ui)
ticket = ui.element('ride-form-ticket')
height = ticket['frame']['height']
assert ui.t('ride.create.form.liveHint') in (ticket.get('AXLabel') or ''), ticket.get('AXLabel')
ui.capture('01-empty-form')

pick_place('ride-form-start', 'sunway', 'Sunway Geo Residences')
ui.wait_label('ride-form-start-short', lambda label: label == ui.t('ride.create.form.shortAuto', short='双威'),
              'the start short name is not filled from the table')
pick_place('ride-form-dest', 'klia', 'KLIA2')
ui.wait_label('ride-form-dest-short', lambda label: label == ui.t('ride.create.form.shortAuto', short='KLIA2'),
              'the destination short name is not KLIA2')
ui.wait_label('ride-form-ticket', lambda label: '双威 → KLIA2' in label, 'the ticket does not read 双威 → KLIA2')
assert_touch_target(ui.element('ride-form-start-short-edit'), '改')
ui.capture('02-places')

opened = time.time()
picked = re.search(r'\d{2}:\d{2}', ui.element('ride-form-pick-0').get('AXLabel') or '').group()
local = {first_quick_time(at) for at in (opened - 120, opened)}
assert picked in local, f'the first quick time is {picked}, not the device-zone clock {sorted(local)}'
ui.tap('ride-form-pick-0')
gather = re.compile(ui.pattern('ride.create.form.gather', time=r'\d{2}:\d{2}'))
ui.wait_label('ride-form-gather', lambda label: bool(gather.fullmatch(label)), 'no 起集合 line after a quick time')
ui.wait_label('ride-form-ticket', lambda label: picked in label, f'the ticket does not read the picked {picked}')
ui.at_rest()
items = ui.read()
assert_label_reads(ui.snap('02b-time-selected'), by_id(items, 'ride-form-pick-0')['frame'], 'selected quick time',
                   token('--color-accent', ui.appearance))
shown = picker_clock(ui, 'ride-form-time')
assert shown == picked, f'the date picker shows {shown} for the picked {picked} (both read the device zone)'

form_scroll_to(ui, 'ride-form-seats')
step(ui, 'ride-form-seats', up=True, times=2)
ui.wait_label('ride-form-seats-label', lambda label: ui.t('ride.create.form.sixSeats', count=5) in label,
              'six people do not read 记得叫 6 座的车')
form_scroll_to(ui, 'ride-form-estimate')
ui.tap('ride-form-estimate')
ui.type('76')
form_scroll_to(ui, 'ride-form-fare-footer')
ui.wait_label('ride-form-fare-footer', lambda label: '13' in label and '6' in label,
              'the footer does not split RM 76 among 6')
ui.wait_label('ride-form-ticket', lambda label: '13' in label, 'the ticket stub does not show 每人约 RM 13')
assert abs(ui.element('ride-form-ticket')['frame']['height'] - height) < 1, 'the live ticket changed height'
form_scroll_to(ui, 'ride-form-airport-remove')
ui.element('ride-form-bags')
ui.capture('03-filled')

ui.tap_label(ui.t('ride.create.next'))
ui.element('ride-confirm')
ui.capture('04-confirm')
print('PASS: places with short names, airport group, time, 6 people, estimate and 每人约, fixed ticket height')
