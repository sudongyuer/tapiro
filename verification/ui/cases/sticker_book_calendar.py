"""月历 (sticker book deck, S4): the 月历 pill opens a large sheet titled 月历 with a × close and 贴纸本 · 38 张. Months
run from September to November 2026 and the sheet opens on the month of the card in front (November). A done day shows
its hand art and no number; 24 October, with three stickers, shows the newest art and a 3 badge; an empty day shows only
its number; days after today are fainter. Each week row holds seven days, Monday first (12 October in the first column,
the 18th in the last, on one row). The floating 分享{month} pill names the month most in view and follows the scroll.
Tapping 24 October closes the sheet and the deck jumps to that day's newest card (第 10 张，共 38 张)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, close, reach_home, token  # noqa: E402

DEPS = ['src/features/stickers/', 'src/app/sticker-calendar.tsx', 'src/app/_layout.tsx', 'src/lib/stickers/fixture.ts']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyStickers', 'month', '-uiVerifyToday', '2026-11-21']
DAY = 'sticker-calendar-day-'
MONTHS = {
    'zh-Hans': {8: '九月', 9: '十月', 10: '十一月'},
    'en': {8: 'September', 9: 'October', 10: 'November'},
    'ms': {8: 'September', 9: 'Oktober', 10: 'November'},
}


def colourful(rgb):
    return max(rgb) - min(rgb) > 40


ui = UI(*sys.argv[1:])
names = MONTHS[ui.locale]


def on_screen(identifier):
    found = by_id(ui.read(), identifier)
    return found if found and 140 < found['frame']['y'] < 740 else None


def scroll(up):
    ui.swipe((200, 300), (200, 700), 1.2) if up else ui.swipe((200, 700), (200, 300), 1.2)


def pill_names(month):
    return ui.wait_label('sticker-calendar-share',
                         lambda text: text == ui.t('stickers.calendar.share', month=names[month]),
                         f'the share pill does not name {names[month]}')


reach_home(ui)
ui.tap('tab-me')
ui.tap('me-stickers')
ui.element('sticker-stack')
ui.tap('sticker-book-calendar')
ui.element('sticker-calendar')
count = ui.element('sticker-calendar-count')
expected = ui.t('stickers.calendar.count', title=ui.t('stickers.book.title'), total=ui.tn('stickers.count', 38))
assert count.get('AXLabel') == expected, count
ui.labelled(ui.t('stickers.calendar.close'))
pill = pill_names(10)
assert_touch_target(pill, 'the share pill')
items = ui.read()
november = by_id(items, f'{DAY}2026-11-03')
assert november and november.get('AXLabel') != '', november
assert november.get('type') == 'Button', f'3 November is not a button: {november}'
later = by_id(items, f'{DAY}2026-11-25')
assert later, 'a day after today is missing'
ui.at_rest()
shot = ui.snap('01-november')
done_art = shot.count(november['frame'], colourful)
later_art = shot.count(later['frame'], colourful)
print(f'colourful pixels: 3 November {done_art}, 25 November {later_art}')
assert done_art > 300, f'a done day draws no hand art ({done_art})'
assert later_art < 20, f'a future day draws something ({later_art})'

for _ in range(6):
    if on_screen(f'{DAY}2026-10-12') and on_screen(f'{DAY}2026-10-01'):
        break
    scroll(up=True)
ui.at_rest()
pill_names(9)
items = ui.read()
for day, column in {12: 0, 14: 2, 18: 6}.items():
    cell = by_id(items, f'{DAY}2026-10-{day}')['frame']
    found = int((cell['x'] + cell['width'] / 2 - 16) // ((402 - 32) / 7))
    assert found == column, f'October {day} sits in column {found}, its weekday is column {column} (Monday first)'
monday, sunday = (by_id(items, f'{DAY}2026-10-{day}')['frame'] for day in (12, 18))
assert abs(monday['y'] - sunday['y']) < 1, f'Monday the 12th and Sunday the 18th are not on one row: {monday} {sunday}'
busy = by_id(items, f'{DAY}2026-10-24')
assert (busy.get('AXLabel') or '').count(ui.t('stickers.calendar.join')) >= 2, f'24 October does not read three titles: {busy}'
assert_touch_target(busy, 'a done day')
ui.at_rest()
shot = ui.snap('02-october')
f = busy['frame']
badge = {'x': f['x'] + f['width'] / 2, 'y': f['y'], 'width': f['width'] / 2, 'height': f['height'] / 3}
ink = token('--color-accent', ui.appearance)
badged = shot.count(badge, lambda rgb: close(rgb, ink, 16))
print(f'24 October badge: {badged} accent pixels')
assert badged > 40, f'the day with three stickers shows no count badge ({badged})'

for _ in range(6):
    if on_screen(f'{DAY}2026-09-03'):
        break
    scroll(up=True)
ui.at_rest()
items = ui.read()
empty = by_id(items, f'{DAY}2026-09-03')
assert empty and '帮' not in (empty.get('AXLabel') or ''), empty
shot = ui.snap('03-september')
blank = shot.count(empty['frame'], colourful)
print(f'3 September (empty) colourful pixels: {blank}')
assert blank < 20, f'an empty day draws something ({blank})'

for _ in range(6):
    if on_screen(f'{DAY}2026-10-24'):
        break
    scroll(up=False)
ui.at_rest()
ui.tap(f'{DAY}2026-10-24')
ui.gone('sticker-calendar')
ui.wait_label('sticker-stack-position', lambda text: ui.t('stickers.card.position', index=10, total=38) in text,
              'the deck did not jump to the newest card of 24 October')
ui.capture('04-opened-card')
print('PASS: the calendar scrolls through months, names the one in view and opens the tapped day in the deck')
