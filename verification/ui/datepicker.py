import re

import ocr

SHORT_DATE = re.compile(r'^\d{1,2}/\d{1,2}/\d{2,4}$')


def compact(text):
    return re.sub(r'\s', '', text or '')


def picker_row(items, identifier):
    # The kit row's identifier also lands on its hidden title, which comes first in the tree.
    rows = [i for i in items if i.get('AXUniqueId') == identifier]
    return max(rows, key=lambda i: i['frame']['width'] * i['frame']['height']) if rows else None


def picker_buttons(items, identifier):
    row = picker_row(items, identifier)
    if not row:
        return []
    g = row['frame']

    def inside(f):
        x, y = f['x'] + f['width'] / 2, f['y'] + f['height'] / 2
        return g['x'] <= x <= g['x'] + g['width'] and g['y'] <= y <= g['y'] + g['height']

    # A sheet's tree still lists the screen under it; its buttons carry identifiers, the picker's do not.
    return [i for i in items if i.get('type') == 'Button' and not i.get('AXUniqueId') and inside(i['frame'])]


def picker_value(items, identifier):
    return next((i.get('AXValue') for i in picker_buttons(items, identifier) if i.get('AXValue')), None)


def date_part(value):
    return value.partition(',')[2].strip()


def assert_long_date(value, day, where):
    date = date_part(value)
    assert not SHORT_DATE.match(date), f'{where} fell back to the short date {date!r} (BP-13)'
    assert re.search(rf'(?<!\d){day}(?!\d)', date), f'{where} reads {date!r}, not day {day}'


def assert_ink_reads(ui, identifier, name):
    items = ui.read()
    row = picker_row(items, identifier)['frame']
    band = {'x': 0, 'y': row['y'] - 6, 'width': items[0]['frame']['width'], 'height': row['height'] + 12}
    read = [compact(line['text']) for line in ocr.lines_in(ui.snap(name), ui.locale) if ocr.inside(line, band, slack=4)]
    for button in picker_buttons(items, identifier):
        label = button.get('AXLabel')
        if not label or button.get('AXValue'):
            continue
        assert any(compact(label) in text for text in read), f'{identifier} shows {read}, not its whole {label!r}'


def pick_day(ui, identifier, day, name):
    items = ui.read()
    row = picker_row(items, identifier)['frame']
    band = {'x': 0, 'y': row['y'] - 6, 'width': items[0]['frame']['width'], 'height': row['height'] + 12}
    ink = [line for line in ocr.lines_in(ui.snap(name), ui.locale)
           if ocr.inside(line, band, slack=4) and re.search(r'2026|/', line['text'])]
    assert ink, f'no date text read in {identifier} at {row}'
    ink = min(ink, key=lambda line: line['x'])
    ui.tap_point(ink['x'] + ink['width'] / 2, ink['y'] + ink['height'] / 2)
    days = ui.wait(lambda items: calendar_days(items) or None, 'the calendar did not open')
    target = next((d for d in days if d.get('enabled') is not False
                   and re.search(rf'(?<!\d){day}(?!\d)', d.get('AXLabel') or '')), None)
    assert target, f'day {day} is not offered: {[d.get("AXLabel") for d in days]}'
    f = target['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)
    bottom = max(d['frame']['y'] + d['frame']['height'] for d in days)
    ui.tap_point(8, min(bottom + 120, ui.read()[0]['frame']['height'] - 60), expect_change=False)
    # Over a sheet the tree keeps PopoverDismissRegion after the calendar has closed; wait for its days instead.
    shown = {d.get('AXLabel') for d in days}
    ui.wait(lambda items: not any(d.get('AXLabel') in shown for d in calendar_days(items)), 'the calendar did not close')


def calendar_days(items):
    return [i for i in items if i.get('type') == 'Button' and not i.get('AXUniqueId')
            and 40 <= i['frame']['width'] <= 48 and 36 <= i['frame']['height'] <= 50]
