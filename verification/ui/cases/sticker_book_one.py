"""One sticker (break-ui): the deck shows a single upright card with nothing fanned behind it, no position line and
no 今天; a swipe either way springs back. 分享 still opens a card poster whose collage repeats the one art."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/stickers/', 'src/app/(tabs)/me/', 'src/app/sticker-share.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyStickers', 'one']


def white(rgb):
    return min(rgb) > 245


def colourful(rgb):
    return max(rgb) - min(rgb) > 40


ui = UI(*sys.argv[1:])
reach_home(ui)
ui.tap('tab-me')
ui.tap('me-stickers')
card = ui.element('sticker-card-0')
items = ui.read()
assert by_id(items, 'sticker-stack-position') is None, 'one sticker shows a position line'
assert not any(i.get('AXLabel') == ui.t('stickers.book.today') for i in items), 'one sticker offers 今天'
ui.at_rest()
shot = ui.snap('01-one')
f = card['frame']
behind = {'x': f['x'] - 14, 'y': f['y'] + 40, 'width': 12, 'height': f['height'] - 80}
fanned = shot.count(behind, white)
print(f'white pixels left of the only card: {fanned}')
assert fanned < 40, f'a card is fanned behind the only sticker ({fanned})'
y = f['y'] + f['height'] / 2
ui.swipe((f['x'] + f['width'] * 0.85, y), (f['x'] + f['width'] * 0.1, y), 0.8)
ui.at_rest()
again = ui.element('sticker-card-0')
assert abs(again['frame']['x'] - f['x']) < 1, f'the only card did not spring back: {again["frame"]} vs {f}'
ui.tap('sticker-book-share')
poster = ui.element('sticker-poster')
ui.at_rest()
shot = ui.snap('02-one-poster')
p = poster['frame']
top = {'x': p['x'], 'y': p['y'], 'width': p['width'], 'height': p['height'] * 0.12}
scattered = shot.count(top, colourful)
print(f'collage pixels along the poster top: {scattered}')
assert scattered > 2000, f'the one-sticker poster has no collage ({scattered})'
print('PASS: a single sticker sits alone, springs back and still makes a poster')
