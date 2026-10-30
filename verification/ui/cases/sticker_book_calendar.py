"""月历 (86C, 96A): the native 卡堆 / 月历 switch turns the book into this month's calendar; the choice survives a
relaunch. Days with a done errand show its hand art and read the date, the count and the titles; empty days show only
the number. The month line counts 7 done, and its handwritten heading reads in light and dark. Tapping 帮取快递's day switches back to 卡堆 with that card in front."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402

DEPS = ['src/features/stickers/', 'src/app/(tabs)/me/', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
SEED = ['-uiVerifyBookView', 'stack']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyStickers', 'seven', '-uiVerifyBookView', 'stack']
DAY = 'sticker-calendar-day-'
COLOURFUL_MIN = 300

ui = UI(*sys.argv[1:])


def open_book():
    ui.tap('tab-me')
    ui.tap('me-stickers')
    ui.element('sticker-book')


def day_with(items, title):
    return next(
        (item for item in items
         if (item.get('AXUniqueId') or '').startswith(DAY) and title in (item.get('AXLabel') or '')),
        None,
    )


reach_home(ui)
open_book()
ui.element('sticker-stack')
ui.tap_label(ui.t('stickers.book.view.calendar'))
ui.element('sticker-calendar')
relaunch(ui, drop=SEED)
open_book()
ui.element('sticker-calendar', timeout=30)
assert by_id(ui.read(), 'sticker-stack') is None, 'the relaunch did not keep 月历'

summary = ui.element('sticker-calendar-summary')
assert summary.get('AXLabel') == ui.tn('stickers.calendar.summary', 7), summary
month = ui.element('sticker-calendar-month')
assert (month.get('AXLabel') or '').strip(), 'the month heading is empty'
items = ui.read()
tea = day_with(items, '帮买奶茶')
parcel = day_with(items, '帮取快递')
assert tea and parcel, 'the days with 帮买奶茶 and 帮取快递 are missing'
assert_touch_target(tea, 'a done day')
empty = next(
    (item for item in items
     if (item.get('AXUniqueId') or '').startswith(DAY)
     and not any(word in (item.get('AXLabel') or '') for word in ('帮', '拼车'))),
    None,
)
assert empty, 'no empty day in the month'
shot = ui.snap('01-calendar')
drawn = shot.count(tea['frame'], lambda rgb: max(rgb) - min(rgb) > 40)
blank = shot.count(empty['frame'], lambda rgb: max(rgb) - min(rgb) > 40)
print(f'colourful pixels: done day {drawn}, empty day {blank}')
assert drawn > COLOURFUL_MIN, f'the done day draws no hand art ({drawn})'
assert blank < 20, f'an empty day draws something ({blank})'
ink = shot.count(month['frame'], (lambda rgb: max(rgb) > 200) if ui.appearance == 'dark' else (lambda rgb: max(rgb) < 80))
print(f'month heading ink pixels: {ink}')
assert ink > 200, f'the handwritten month heading does not contrast with the {ui.appearance} background ({ink})'

ui.tap(parcel['AXUniqueId'])
ui.element('sticker-stack')
ui.wait(
    lambda now: next(
        (item for item in now
         if (item.get('AXUniqueId') or '').startswith('sticker-card-')
         and '帮取快递' in (item.get('AXLabel') or '')
         and item['frame']['x'] >= 0 and item['frame']['x'] < 200),
        None,
    ),
    'the stack does not open on 帮取快递',
)
ui.capture('02-opened-card')
print('PASS: the calendar is remembered, shows hand art on done days only and opens the tapped card')
