"""我的 shows 贴纸本 · 7 张 above 收款方式; the row pushes the book, now one deck of done cards (sticker book deck, S1–S3):
the newest card upright on top with two cards fanned behind it, the card's date as the navigation title, 第 1 张，共 7 张
under the deck, and two 44 pt pills at the bottom, 月历 and the ink-filled 分享. The first card reads who helped whom
and the title, and its hand art is drawn. A left swipe tilts the card with the finger and sends it off to the left
(the recorded clip shows the card leaving its place), the older card comes up, the position line follows and 今天
appears in the bar; the third card (a ride) draws the red car. A right swipe on the newest card springs back: the
position stays 1. 今天 jumps back to the newest card and disappears."""
import shutil
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
import recording  # noqa: E402
from driver import UI, Shot, assert_touch_target, by_id, close, reach_home, token  # noqa: E402

WORST_NAME = 'Nurul Aisyah binti Wan Abdul Rahman Shah'
WORST_TITLE = '帮忙从 Mid Valley Megamall 的 Uniqlo 取一件外套，顺便在 Sunway Pyramid 的 ZUS Coffee 买两杯 Spanish Latte，再送到 Universiti Malaya Kolej 宿舍楼'
RIDE_TITLE = 'Pangsapuri Vista Harmoni Blok C → KLIA2 Terminal Ketibaan Antarabangsa'

DEPS = ['src/features/stickers/', 'src/app/(tabs)/me/', 'src/features/account/', 'assets/hand-art/',
        'src/ui/PillButton.tsx', 'verification/ui/recording.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyStickers', 'worst']
ART_HEIGHT = 200
COLOURFUL_MIN = 4000


def colourful(rgb):
    return max(rgb) - min(rgb) > 40


def red(rgb):
    return rgb[0] > 170 and rgb[1] < 120 and rgb[2] < 120


def white(rgb):
    return min(rgb) > 245


def art(f):
    return {'x': f['x'], 'y': f['y'], 'width': f['width'], 'height': ART_HEIGHT}


def position_is(index):
    return ui.wait_label('sticker-stack-position',
                         lambda text: ui.t('stickers.card.position', index=index, total=7) in text,
                         f'the position line does not read card {index}')


def today_shown(items):
    return any(i.get('AXLabel') == ui.t('stickers.book.today') and i.get('type') == 'Button' for i in items)


ui = UI(*sys.argv[1:])
reach_home(ui)
ui.tap('tab-me')
row = ui.wait_label('me-stickers', lambda label: ui.tn('stickers.count', 7) in label,
                    'the 我的 row does not count 7 stickers')
assert ui.t('stickers.book.title') in (row.get('AXLabel') or ''), row.get('AXLabel')
assert row['frame']['y'] < ui.element('me-payee')['frame']['y'], 'the sticker row is not above 收款方式'
assert_touch_target(row, 'sticker row')
ui.capture('01-me')
ui.tap('me-stickers')
ui.element('sticker-stack')
card = ui.element('sticker-card-0')
label = card.get('AXLabel') or ''
for part in (ui.t('stickers.label.payee', name=WORST_NAME), WORST_TITLE):
    assert part in label, f'the top card does not read {part!r}: {label!r}'
assert ui.t('stickers.card.position', index=1, total=7) in str(card.get('AXValue')), card
position_is(1)
assert not today_shown(ui.read()), '今天 shows on the newest card'
calendar, share = ui.element('sticker-book-calendar'), ui.element('sticker-book-share')
for pill, name in ((calendar, '月历'), (share, '分享')):
    assert_touch_target(pill, name)
assert calendar.get('AXLabel') == ui.t('stickers.book.calendar'), calendar
assert share.get('AXLabel') == ui.t('stickers.book.share'), share
assert abs(calendar['frame']['y'] - share['frame']['y']) < 1, 'the two pills are not on one row'
assert share['frame']['y'] > card['frame']['y'] + card['frame']['height'], 'the pills are not under the deck'
ui.at_rest()
shot = ui.snap('02-deck')
ink = token('--color-accent', ui.appearance)
filled = shot.count(share['frame'], lambda rgb: close(rgb, ink, 12))
print(f'分享 fill: {filled} accent pixels')
assert filled > share['frame']['width'] * share['frame']['height'] * 0.4, f'分享 is not filled with the ink ({filled})'
drawn = shot.count(art(card['frame']), colourful)
print(f'top card: {drawn} colourful pixels')
assert drawn > COLOURFUL_MIN, f'the top card draws no hand art ({drawn} colourful pixels)'
f = card['frame']
behind = {'x': f['x'] - 14, 'y': f['y'] + 40, 'width': 12, 'height': f['height'] - 80}
fanned = shot.count(behind, white)
print(f'cards fanned out left of the top card: {fanned} white pixels')
assert fanned > 100, f'no card peeks out behind the top card ({fanned})'

y = f['y'] + f['height'] / 2
# An axe swipe of 0.8 s reaches the app as a short drag (the card goes about a quarter of the way and springs back);
# 0.5, 1.2 and 2.0 s deliver the whole stroke (probe, 2026-11-21).
strip = {'x': f['x'] - 60, 'y': y - 40, 'width': 40, 'height': 80}
with recording.clip(ui, 'deck-swipe') as video:
    ui.swipe((f['x'] + f['width'] * 0.85, y), (f['x'] + f['width'] * 0.1, y), 1.2)
    position_is(2)
frames = recording.frames(video, ui.output / 'deck-swipe-frames')
moved = [(path, t, Shot(path, shot.width / shot.scale).count(strip, white)) for path, t in frames]
path, t, most = max(moved, key=lambda entry: entry[2])
print(f'deck swipe: {len(frames)} frames, most card-white left of the deck {most} at {t:.2f}s')
assert most > 1500, f'the top card never followed the finger to the left ({most})'
shutil.copy(path, ui.output / '03-mid-swipe.png')
ui.wait(today_shown, '今天 does not appear once an older card is on top')
ui.swipe((f['x'] + f['width'] * 0.85, y), (f['x'] + f['width'] * 0.1, y), 1.2)
position_is(3)
ride = ui.wait_label('sticker-card-2', lambda text: RIDE_TITLE in text, 'the third card is not the ride')
ui.at_rest()
ride_shot = ui.snap('04-ride')
car_red = ride_shot.count(art(ride['frame']), red)
print(f'ride card: {car_red} red pixels')
assert car_red > 1500, f'the ride card does not draw the red car ({car_red} red pixels)'

ui.tap_label(ui.t('stickers.book.today'))
position_is(1)
ui.wait(lambda items: not today_shown(items), '今天 stays after jumping to the newest card')
ui.swipe((f['x'] + f['width'] * 0.15, y), (f['x'] + f['width'] * 0.9, y), 1.2)
ui.at_rest()
assert by_id(ui.read(), 'sticker-card-0'), 'a right swipe on the newest card left it'
position_is(1)
ui.capture('05-back-to-newest')
print('PASS: the deck turns with the finger, older to the left, and 今天 returns to the newest card')
