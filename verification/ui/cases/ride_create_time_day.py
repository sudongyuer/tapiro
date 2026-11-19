"""出发 and 航班起飞 keep their whole text when the day widens (BP-13's class, bounty post ruling 28). Pinned to 12-09
at 23:00, the first quick time departs on the 10th; the calendar moves it back to the 9th and the same quick time moves
it to the wider 10th again. Every step writes the long date (2026年12月10日, 10 Dis 2026), never the short 10/12/26,
and the picker's ink reads its date and clock whole. The airport draft's flight picker reads 09:10 whole."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from datepicker import assert_ink_reads, assert_long_date, pick_day, picker_value  # noqa: E402
from driver import UI  # noqa: E402
from ride import form_scroll_to, open_form, open_list  # noqa: E402

DEPS = ['src/features/ride/create/', 'src/app/ride-create/', 'verification/ui/ride.py', 'verification/ui/datepicker.py',
        'src/lib/verifyToday.ts', 'modules/tapiro-kit/ios/DateTimeRowView.swift']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDraft', 'airport',
        '-uiVerifyToday', '2026-12-09']
# At 23:00 the first quick time (now + 30 min, rounded up to the half hour) is past midnight.
LOCAL_HOURS = [23]

ui = UI(*sys.argv[1:])


def departs_on(day, step):
    value = ui.wait(lambda items: (lambda v: v if v and str(day) in v.partition(',')[2] else None)(
        picker_value(items, 'ride-form-time')), f'出发 does not move to the {day}th after {step}')
    assert_long_date(value, day, f'出发 after {step}')
    ui.at_rest()
    assert_ink_reads(ui, 'ride-form-time', f'0{day}-{step}')
    return value


open_list(ui)
open_form(ui)
ui.element('ride-form-time')
ui.tap('ride-form-pick-0')
departs_on(10, 'quick')
pick_day(ui, 'ride-form-time', 9, '02-before-calendar')
departs_on(9, 'calendar')
ui.tap('ride-form-pick-0')
departs_on(10, 'quick-again')

form_scroll_to(ui, 'ride-form-flight')
flight = ui.wait(lambda items: picker_value(items, 'ride-form-flight'), 'the flight picker has no value')
assert '9' in flight and '10' in flight, f'the flight picker reads {flight!r}, not the draft\'s 09:10'
ui.at_rest()
assert_ink_reads(ui, 'ride-form-flight', '03-flight')
print('PASS: 出发 keeps the long date across a wider day; the flight clock reads whole')
