"""「＋ 时间」 and 「＋ 说明」 expand in place under a heading row with 移除 on its right (156A): the time row offers three
quick picks (161A; 「明天」 sets tomorrow 21:00 and sticks), then 截止 / 时间段 with system date pickers whose calendar
disables past days, and 移除 collapses it back. On a 12-hour device the live card and confirm write each time as its
picker shows it (晚上9:00). Confirm shows the deadline and the description's first line; the description counter stays
hidden for a short note. A seeded long draft shows its counters in code points (an emoji counts once)."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import close_sheet_by_swipe, dismiss_keyboard, fill_fixed, form_scroll_to, open_post, relaunch, typed  # noqa: E402
from driver import UI, by_id, picker_time, plain  # noqa: E402
from ocr import find, lines_in  # noqa: E402

DEPS = ['src/features/bounty/', 'src/lib/deviceClock.ts', 'src/lib/i18n/index.tsx', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx', 'src/features/place/', 'src/features/block/',
        'src/lib/verifyToday.ts', 'modules/tapiro-kit/ios/DateTimeRowView.swift']
LOCALES = ['zh-Hans', 'ms']
# 明天 moves the deadline from the 9th to the wider 10th in every locale, the day BP-13 shows; before 22:00 the added
# deadline stays on the 9th.
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'none', '-AppleICUForce12HourTime', 'YES',
        '-uiVerifyToday', '2026-12-09']
LOCAL_HOURS = [10, 11, 12, 13, 14, 15, 16]
BUDGET = 300
WORST_TITLE = '帮忙从 Mid Valley Megamall 取 Uniqlo 外套再买两杯 Tealive 🧋送到 Sunway 楼'
NOTE = 'Parcel at the door'

ui = UI(*sys.argv[1:])


def picker_button(items, identifier):
    group = by_id(items, identifier)
    if not group:
        return None
    g = group['frame']

    def inside(f):
        x, y = f['x'] + f['width'] / 2, f['y'] + f['height'] / 2
        return g['x'] <= x <= g['x'] + g['width'] and g['y'] <= y <= g['y'] + g['height']

    return next((i for i in items if i.get('type') == 'Button' and inside(i['frame']) and i.get('AXValue')), None)


def picker_value(items, identifier):
    button = picker_button(items, identifier)
    return button.get('AXValue') if button else None


def date_part(value):
    return value.partition(',')[2].strip()


def counter(identifier, count, maximum):
    expected = ui.t('bounty.post.form.countLabel', count=count, max=maximum)
    ui.wait_label(identifier, lambda label: label == expected, f'{identifier} does not read {expected!r}')


open_post(ui)
ui.element('bounty-post-add-time')
ui.element('bounty-post-add-description')
assert by_id(ui.read(), 'bounty-post-deadline') is None, 'the time row is open before 「＋ 时间」'
ui.capture('01-collapsed')

fill_fixed(ui, slug='other')
dismiss_keyboard(ui)
ui.tap('bounty-post-add-time')
ui.element('bounty-post-deadline')
ui.element('bounty-post-remove-time')
ui.gone('bounty-post-add-time')
before = ui.wait(lambda items: picker_value(items, 'bounty-post-deadline'), 'deadline picker has no value')
form_scroll_to(ui, 'bounty-post-deadline')
# The picker element spans the row beside its title and draws its buttons at the trailing edge; tap the date's ink.
row = picker_button(ui.read(), 'bounty-post-deadline')['frame']
date_ink = find(lines_in(ui.snap('02-deadline'), ui.locale), r'2026', row)
assert date_ink, f'no date text read in the deadline picker at {row}'
date_ink = min(date_ink, key=lambda line: line['x'])
ui.tap_point(date_ink['x'] + date_ink['width'] / 2, date_ink['y'] + date_ink['height'] / 2)
days = ui.wait(lambda items: [i for i in items if i.get('type') == 'Button' and not i.get('AXUniqueId')
                              and 40 <= i['frame']['width'] <= 48
                              and 36 <= i['frame']['height'] <= 50] or None, 'the calendar did not open')
assert any(day.get('enabled') is False for day in days), 'past days are not disabled in the calendar'
ui.capture('02a-calendar')
calendar_bottom = max(day['frame']['y'] + day['frame']['height'] for day in days)
ui.tap_point(8, min(calendar_bottom + 120, ui.read()[0]['frame']['height'] - 60))
ui.gone('PopoverDismissRegion')
ui.tap('bounty-post-pick-time-tomorrow')
after = ui.wait(lambda items: (lambda value: value if value and value != before and re.search(r'(21|9)[:.]00', value)
                               else None)(picker_value(items, 'bounty-post-deadline')),
                f'the 明天 quick pick did not set tomorrow 21:00 (still {before!r})')
ui.capture('02b-time-pick')

ui.tap_label(ui.t('bounty.post.form.window'))
ui.element('bounty-post-start')
ui.element('bounty-post-end')
items = ui.read()
assert by_id(items, 'bounty-post-deadline') is None, '截止 still shown after choosing 时间段'
values = [picker_value(items, identifier) or '' for identifier in ('bounty-post-start', 'bounty-post-end')]
window = [picker_time(value) for value in values]
day = date_part(after)
dates = [date_part(value) for value in values]
assert dates == [day, day], f'开始 and 结束 do not write tomorrow as 截止 did ({day!r}): {dates} (BP-13)'
assert all(':' in shown for shown in window), f'the window pickers show no time: {window}'
# The live card heads the form; in ms the longer rows leave it scrolled off, out of the tree.
form_scroll_to(ui, 'bounty-post-live-text', up=True)
ui.wait_label('bounty-post-live-text', lambda label: all(shown in plain(label) for shown in window),
              f'the live card does not write the picked times {window}')
ui.capture('02-window')
ui.tap_label(ui.t('bounty.post.form.deadline'))
ui.element('bounty-post-deadline')
ui.gone('bounty-post-start')
chosen = ui.wait(lambda items: picker_value(items, 'bounty-post-deadline'), 'deadline picker has no value')
assert date_part(chosen) == day, f'截止 shown again writes tomorrow as {date_part(chosen)!r}, not {day!r} (BP-13)'

form_scroll_to(ui, 'bounty-post-add-description')
ui.tap('bounty-post-add-description')
form_scroll_to(ui, 'bounty-post-description')
ui.element('bounty-post-remove-description')
typed(ui, 'bounty-post-description', NOTE, band=False)
dismiss_keyboard(ui)
ui.gone('bounty-post-description-count')
ui.gone('bounty-post-remove-description')
ui.capture('03-expanded')

clock = picker_time(chosen)
ui.tap_label(ui.t('bounty.post.next'))
ui.element('bounty-post-confirm')
ui.wait_label('bounty-post-time', lambda label: clock in plain(label) and ui.t('bounty.post.confirm.tomorrow') in label,
              f'confirm does not show the chosen deadline (tomorrow {clock}, picker read {chosen!r})')
ui.wait_label('bounty-post-summary-description', lambda label: NOTE in label,
              'confirm does not show the description')
ui.capture('04-confirm')
ui.tap('BackButton')
ui.element('bounty-post-form')

ui.tap('bounty-post-remove-time')
ui.element('bounty-post-add-time')
ui.gone('bounty-post-deadline')
ui.capture('05-time-removed')

assert len(WORST_TITLE) != len(WORST_TITLE.encode('utf-16-le')) // 2, 'the seeded title must contain an astral character'
close_sheet_by_swipe(ui)
relaunch(ui, add=['-uiVerifyBountyDraft', 'worst'])
open_post(ui)
counter('bounty-post-title-count', len(WORST_TITLE), 60)
ui.capture('06-worst-counters')
print(f'PASS: time and description rows expand, a picked time sticks ({before} → {after}), counters count code points')
