"""我的 shows 一起办成的事 · 7 张 above 收款方式; the row pushes the book (95A, 96A): outlined title, count line, a native
卡堆 / 月历 switch on 卡堆, and the worst-case stickers as a stack of done cards, newest on top. Each card reads date,
who helped whom, then the title; its hand art is drawn (colourful pixels in the art area), the first card (a coffee
errand) draws the milk-tea cup and the third (a ride) draws the red car. Swiping turns the cards and the position
line follows."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402

WORST_NAME = 'Nurul Aisyah binti Wan Abdul Rahman Shah'
WORST_TITLE = '帮忙从 Mid Valley Megamall 的 Uniqlo 取一件外套，顺便在 Sunway Pyramid 的 ZUS Coffee 买两杯 Spanish Latte，再送到 Universiti Malaya Kolej 宿舍楼'
RIDE_TITLE = 'Pangsapuri Vista Harmoni Blok C → KLIA2 Terminal Ketibaan Antarabangsa'

DEPS = ['src/features/stickers/', 'src/app/(tabs)/me/', 'src/features/account/', 'assets/hand-art/']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyStickers', 'worst', '-uiVerifyBookView', 'stack']
ART_HEIGHT = 200
COLOURFUL_MIN = 4000


def colourful(rgb):
    return max(rgb) - min(rgb) > 40


def red(rgb):
    return rgb[0] > 170 and rgb[1] < 120 and rgb[2] < 120


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
ui.element('sticker-book-view')
ui.labelled(ui.t('stickers.book.view.stack'))
ui.labelled(ui.t('stickers.book.view.calendar'))
ui.element('sticker-stack')
card = ui.element('sticker-card-0')
label = card.get('AXLabel') or ''
for part in (ui.t('stickers.label.payee', name=WORST_NAME), WORST_TITLE):
    assert part in label, f'the top card does not read {part!r}: {label!r}'
position = ui.element('sticker-stack-position')
assert ui.t('stickers.card.position', index=1, total=7) in (position.get('AXLabel') or ''), position
shot = ui.snap('02-stack')


def art(f):
    return {'x': f['x'], 'y': f['y'], 'width': f['width'], 'height': ART_HEIGHT}


top_art = art(card['frame'])
drawn = shot.count(top_art, colourful)
top_red = shot.count(top_art, red)
print(f'top card: {drawn} colourful pixels, {top_red} red')
assert drawn > COLOURFUL_MIN, f'the top card draws no hand art ({drawn} colourful pixels)'

f = card['frame']
y = f['y'] + f['height'] / 2
for _ in range(2):
    ui.swipe((f['x'] + f['width'] * 0.85, y), (f['x'] + f['width'] * 0.1, y), 0.3)
ride = ui.wait_label('sticker-card-2', lambda text: RIDE_TITLE in text, 'the third card is not the ride')
ui.wait_label(
    'sticker-stack-position',
    lambda text: ui.t('stickers.card.position', index=3, total=7) in text,
    'the position line does not follow the swipe',
)
ride_shot = ui.snap('03-ride')
car_red = ride_shot.count(art(ride['frame']), red)
print(f'ride card: {car_red} red pixels')
assert car_red > max(1500, top_red * 4), f'the ride card does not draw the red car ({car_red} red pixels)'
assert by_id(ui.read(), 'sticker-calendar') is None, 'the calendar shows on 卡堆'
print('PASS: the book opens on a stack of hand-drawn done cards, newest first, and swipes through them')
