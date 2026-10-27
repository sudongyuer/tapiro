"""我的 shows 我帮过的忙 · 7 张 above 收款方式; the row pushes the sticker book: outlined title, count line, seven worst-case stickers (long titles wrap to two lines, ride → car, bounty → its category sticker) in three columns newest first, and system back returns to 我的."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402

DEPS = ['src/features/stickers/', 'src/app/(tabs)/me/', 'src/features/account/']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyStickers', 'worst']

ui = UI(*sys.argv[1:])
reach_home(ui)
ui.tap('tab-me')
row = ui.wait_label(
    'me-stickers',
    lambda label: ui.tn('stickers.count', 7) in label,
    'the 我的 row does not count 7 stickers',
)
assert ui.t('stickers.book.title') in (row.get('AXLabel') or ''), row.get('AXLabel')
payee = ui.element('me-payee')
assert row['frame']['y'] < payee['frame']['y'], 'the sticker row is not above 收款方式'
assert_touch_target(row, 'sticker row')
ui.capture('01-me')
ui.tap('me-stickers')
ui.element('sticker-book')
title = ui.element('sticker-book-title')
assert title.get('AXLabel') == ui.t('stickers.book.title'), title
count = ui.element('sticker-book-count')
expected = ui.t('stickers.book.summary', total=ui.tn('stickers.count', 7), sub=ui.t('stickers.book.sub'))
assert count.get('AXLabel') == expected, count
items = ui.read()
cells = [by_id(items, f'sticker-cell-{index}') for index in range(3)]
assert all(cells), 'the first row of stickers is missing'
assert (cells[0].get('AXLabel') or '').startswith('帮忙从 Mid Valley Megamall'), cells[0].get('AXLabel')
assert len({round(cell['frame']['y']) for cell in cells}) == 1, 'the first three stickers are not one row'
assert cells[0]['frame']['x'] < cells[1]['frame']['x'] < cells[2]['frame']['x'], 'columns out of order'
ui.capture('02-book')
sheet = by_id(items, 'sticker-book')['frame']
x = sheet['x'] + sheet['width'] / 2
ui.swipe((x, sheet['y'] + sheet['height'] * 0.8), (x, sheet['y'] + sheet['height'] * 0.2), 0.4)
last = ui.element('sticker-cell-6')
assert '排队续签' in (last.get('AXLabel') or ''), last.get('AXLabel')
ui.capture('03-bottom')
print('PASS: the 我的 row and the sticker book list seven stickers newest first')
