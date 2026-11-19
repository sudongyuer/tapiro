"""The organiser's 改出发时间 and 预计到 pickers keep their whole text (BP-13's class, bounty post ruling 28). Pinned to
12-09, 新的出发时间 opens on the 10th with the long date (2026年12月10日, 10 Dis 2026, never 10/12/26) and keeps it when
its calendar moves it to the 11th, the last day the sheet allows (24 hours after the planned time); 预计到 reads its
clock whole."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from datepicker import assert_ink_reads, assert_long_date, pick_day, picker_value  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/features/ride/detail/', 'verification/ui/datepicker.py', 'src/lib/verifyToday.ts',
        'modules/tapiro-kit/ios/DateTimeRowView.swift']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'organiser',
        '-uiVerifyToday', '2026-12-09']
# The fixture departs at 06:30 tomorrow; before 06:00 the sheet's earliest time stays on the 10th.
LOCAL_HOURS = [2, 3, 4, 5]

ui = UI(*sys.argv[1:])


def open_menu_item(key):
    ui.tap_label(ui.t('ride.detail.more'))
    ui.tap_label(ui.t(f'ride.detail.menu.{key}'))


ui.element('ride-detail-ticket')
open_menu_item('reviseTime')
value = ui.wait(lambda items: picker_value(items, 'ride-time-picker'), '新的出发时间 has no value')
assert_long_date(value, 10, '新的出发时间 as opened')
ui.at_rest()
assert_ink_reads(ui, 'ride-time-picker', '01-time-opened')
pick_day(ui, 'ride-time-picker', 11, '01b-before-calendar')
value = ui.wait(lambda items: (lambda v: v if v and '11' in v.partition(',')[2] else None)(
    picker_value(items, 'ride-time-picker')), '新的出发时间 does not move to the 11th')
assert_long_date(value, 11, '新的出发时间 after the calendar')
ui.at_rest()
assert_ink_reads(ui, 'ride-time-picker', '02-time-11th')
ui.tap('ride-time-cancel')
ui.gone('ride-time-picker')

open_menu_item('editDetails')
ui.element('ride-details-eta-toggle')
ui.at_rest()
# The sheet's switch missed a first touch on the old build twice in a probe (2026-11-19); a second touch is what a
# person does, and the picker must then show.
for attempt in range(2):
    ui.flip('ride-details-eta-toggle')
    try:
        ui.element('ride-details-eta', timeout=8)
        break
    except AssertionError:
        if attempt:
            raise
eta = ui.wait(lambda items: picker_value(items, 'ride-details-eta'), '预计到 shows no picker after the switch')
assert ':' in eta or '.' in eta, f'预计到 reads {eta!r}'
ui.at_rest()
assert_ink_reads(ui, 'ride-details-eta', '03-eta')
print('PASS: 改出发时间 keeps the long date through its calendar; 预计到 reads whole')
