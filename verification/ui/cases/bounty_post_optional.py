"""「＋ 时间」 and 「＋ 说明」 expand in place: the time row offers 截止 / 时间段 with system date pickers, a picked time
sticks, and 移除 collapses it back; confirm shows the deadline and the description's first line; the description counter counts what was typed. A seeded long draft shows its
counters in code points (an emoji counts once)."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import fill_fixed, open_post, relaunch, typed  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'none']
BUDGET = 300
WORST_TITLE = '帮忙从 Mid Valley Megamall 取 Uniqlo 外套再买两杯 Tealive 🧋送到 Sunway 楼'
NOTE = 'parcel at the door'
OUTSIDE_POPOVER = (200, 820)

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

ui.tap('bounty-post-add-time')
ui.element('bounty-post-deadline')
ui.gone('bounty-post-add-time')
before = ui.wait(lambda items: picker_value(items, 'bounty-post-deadline'), 'deadline picker has no value')
row = ui.element('bounty-post-deadline')['frame']
ui.tap_point(row['x'] + 40, row['y'] + row['height'] / 2)
days = ui.wait(lambda items: [i for i in items if i.get('type') == 'Button' and 40 <= i['frame']['width'] <= 48
                              and 40 <= i['frame']['height'] <= 50] or None, 'the calendar did not open')
assert any(day.get('enabled') is False for day in days), 'past days are not disabled in the calendar'
open_days = sorted((day for day in days if day.get('enabled')), key=lambda day: (day['frame']['y'], day['frame']['x']))
ui.capture('02a-calendar')
if len(open_days) < 2:
    top = min(day['frame']['y'] for day in days)
    header = [i for i in ui.read() if i.get('type') == 'Button' and i.get('enabled') and i['frame']['y'] < top - 20
              and i['frame']['width'] < 60]
    forward = max(header, key=lambda i: i['frame']['x'])['frame']
    ui.tap_point(forward['x'] + forward['width'] / 2, forward['y'] + forward['height'] / 2)
    first = ui.wait(lambda items: min((i for i in items if i.get('type') == 'Button' and i.get('enabled')
                                       and 40 <= i['frame']['width'] <= 48 and 40 <= i['frame']['height'] <= 50),
                                      key=lambda day: (day['frame']['y'], day['frame']['x']), default=None),
                    'next month shows no open day')
    open_days = [open_days[0], first]
tomorrow = open_days[1]['frame']
ui.tap_point(tomorrow['x'] + tomorrow['width'] / 2, tomorrow['y'] + tomorrow['height'] / 2)
ui.tap_point(OUTSIDE_POPOVER[0], OUTSIDE_POPOVER[1])
ui.gone('PopoverDismissRegion')
after = ui.wait(lambda items: (lambda value: value if value and value != before else None)(
    picker_value(items, 'bounty-post-deadline')), f'the picked time did not stick (still {before!r})')

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
counter('bounty-post-description-count', len(NOTE), 500)
ui.gone('bounty-post-remove-description')
ui.capture('03-expanded')

chosen = picker_value(ui.read(), 'bounty-post-deadline')
clock = re.search(r'\d{1,2}:\d{2}', chosen).group(0)
fill_fixed(ui)
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
ui.tap_label(ui.t('bounty.post.cancel'))
ui.gone('bounty-post-form')
relaunch(ui, add=['-uiVerifyBountyDraft', 'worst'])
open_post(ui)
counter('bounty-post-title-count', len(WORST_TITLE), 60)
ui.capture('06-worst-counters')
print(f'PASS: time and description rows expand, a picked time sticks ({before} → {after}), counters count code points')
