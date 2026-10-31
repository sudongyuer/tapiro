"""「＋ 时间」 and 「＋ 说明」 expand in place under a heading row with 移除 on its right (156A): the time row offers three
quick picks (161A; 「明天」 sets tomorrow 21:00 and sticks), then 截止 / 时间段 with system date pickers whose calendar
disables past days, and
移除 collapses it back; confirm shows the deadline and the description's first line; the description counter stays
hidden for a short note. A seeded long draft shows its counters in code points (an emoji counts once)."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import close_sheet_by_swipe, fill_fixed, form_scroll_to, open_post, relaunch, typed  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'none']
BUDGET = 300
WORST_TITLE = '帮忙从 Mid Valley Megamall 取 Uniqlo 外套再买两杯 Tealive 🧋送到 Sunway 楼'
NOTE = 'parcel at the door'

ui = UI(*sys.argv[1:])


def picker_value(items, identifier):
    group = by_id(items, identifier)
    if not group:
        return None
    return next((i.get('AXValue') for i in items
                 if i.get('type') == 'Button' and i['frame'] == group['frame'] and i.get('AXValue')), None)


def counter(identifier, count, maximum):
    expected = ui.t('bounty.post.form.countLabel', count=count, max=maximum)
    ui.wait_label(identifier, lambda label: label == expected, f'{identifier} does not read {expected!r}')


open_post(ui)
ui.element('bounty-post-add-time')
ui.element('bounty-post-add-description')
assert by_id(ui.read(), 'bounty-post-deadline') is None, 'the time row is open before 「＋ 时间」'
ui.capture('01-collapsed')

fill_fixed(ui, slug='other')
ui.tap('bounty-post-add-time')
ui.element('bounty-post-deadline')
ui.element('bounty-post-remove-time')
ui.gone('bounty-post-add-time')
before = ui.wait(lambda items: picker_value(items, 'bounty-post-deadline'), 'deadline picker has no value')
row = form_scroll_to(ui, 'bounty-post-deadline')['frame']
ui.tap_point(row['x'] + 40, row['y'] + row['height'] / 2)
days = ui.wait(lambda items: [i for i in items if i.get('type') == 'Button' and not i.get('AXUniqueId')
                              and 40 <= i['frame']['width'] <= 48
                              and 40 <= i['frame']['height'] <= 50] or None, 'the calendar did not open')
assert any(day.get('enabled') is False for day in days), 'past days are not disabled in the calendar'
ui.capture('02a-calendar')
calendar_bottom = max(day['frame']['y'] + day['frame']['height'] for day in days)
ui.tap_point(8, min(calendar_bottom + 120, ui.read()[0]['frame']['height'] - 60))
ui.gone('PopoverDismissRegion')
ui.tap('bounty-post-pick-time-tomorrow')
after = ui.wait(lambda items: (lambda value: value if value and value != before and re.search(r'(21|9):00', value)
                               else None)(picker_value(items, 'bounty-post-deadline')),
                f'the 明天 quick pick did not set tomorrow 21:00 (still {before!r})')
ui.capture('02b-time-pick')

ui.tap_label(ui.t('bounty.post.form.window'))
ui.element('bounty-post-start')
ui.element('bounty-post-end')
assert by_id(ui.read(), 'bounty-post-deadline') is None, '截止 still shown after choosing 时间段'
ui.capture('02-window')
ui.tap_label(ui.t('bounty.post.form.deadline'))
ui.element('bounty-post-deadline')
ui.gone('bounty-post-start')

ui.tap('bounty-post-add-description')
ui.element('bounty-post-description')
ui.element('bounty-post-remove-description')
typed(ui, 'bounty-post-description', NOTE, NOTE.capitalize(), band=False)
ui.tap('bounty-post-title')
ui.gone('bounty-post-description-count')
ui.gone('bounty-post-remove-description')
ui.capture('03-expanded')

chosen = picker_value(ui.read(), 'bounty-post-deadline')
clock = re.search(r'\d{1,2}:\d{2}', chosen).group(0)
ui.tap_label(ui.t('bounty.post.next'))
ui.element('bounty-post-confirm')
ui.wait_label('bounty-post-time', lambda label: clock in label and ui.t('bounty.post.confirm.tomorrow') in label,
              f'confirm does not show the chosen deadline (tomorrow {clock}, picker read {chosen!r})')
ui.wait_label('bounty-post-summary-description', lambda label: NOTE.capitalize() in label,
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
