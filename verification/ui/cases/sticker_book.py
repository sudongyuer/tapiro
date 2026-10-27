"""我的 shows 我帮过的忙 · 7 张 above 收款方式; the row pushes the sticker book: outlined title, count line, seven worst-case stickers (long titles wrap to two lines, ride → car, bounty → its category sticker, checked by the art's colours) in three columns newest first, and system back returns to 我的."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, close, reach_home, token  # noqa: E402

DEPS = ['src/features/stickers/', 'src/app/(tabs)/me/', 'src/features/account/']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyStickers', 'worst']
ART_MIN = 3000

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
shot = ui.snap('02-book')


def art_pixels(cell, name):
    f = cell['frame']
    art = {'x': f['x'], 'y': f['y'], 'width': f['width'], 'height': min(f['height'], 100)}
    colour = token(name, ui.appearance)
    return shot.count(art, lambda rgb: close(rgb, colour))


ART = [('--color-sticker-other', 'other category'), ('--color-object-coral', 'car'), ('--color-sticker-study', 'study category')]
counts = [[art_pixels(cell, name) for name, _ in ART] for cell in cells]
print(f'art pixels per cell (other, car, study): {counts}')
for index, (_, label) in enumerate(ART):
    own = counts[index][index]
    assert own > ART_MIN, f'cell {index} does not draw the {label} sticker ({own} pixels)'
    for other in range(3):
        if other != index:
            assert counts[other][index] < own / 10, f'cell {other} shows {label} colours ({counts[other][index]} pixels)'
sheet = by_id(items, 'sticker-book')['frame']
x = sheet['x'] + sheet['width'] / 2
ui.swipe((x, sheet['y'] + sheet['height'] * 0.8), (x, sheet['y'] + sheet['height'] * 0.2), 0.4)
last = ui.element('sticker-cell-6')
assert '排队续签' in (last.get('AXLabel') or ''), last.get('AXLabel')
ui.capture('03-bottom')
print('PASS: the 我的 row and the sticker book list seven stickers newest first')
