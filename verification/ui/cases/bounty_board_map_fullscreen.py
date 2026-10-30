"""Full-screen map (85A): the home board in map view has a 44 pt expand button at the map's top-right corner, read by
VoiceOver as 全屏看地图; it presents the map as a full-screen cover that fills the screen edge to edge, with the 全部 /
急 / 塞得进空档 chips floating under the safe area, a close button top-left read as 关闭地图 and the system location
button bottom-right (the board origin is the user's location); a pin opens its card there, and 看详情 dismisses the cover
and pushes the detail; the 急 filter chosen in full screen is the board's own, so closing the cover returns to the board
in map view with 急 still selected."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen, visible  # noqa: E402
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402
from map import BACK, FRONT, MAP, close_card, face_box, inside, map_at_rest, pin_id, pins, tap_pin  # noqa: E402

DEPS = ['src/features/bounty/map/', 'src/features/bounty/board/', 'src/app/bounty-map.tsx', 'src/app/_layout.tsx',
        'src/app/(tabs)/bounty/', 'src/features/home/', 'modules/tapiro-kit/ios/BountyMapView.swift',
        'modules/tapiro-kit/ios/BountyPinView.swift', 'verification/ui/map.py', 'verification/ui/board.py']
BUDGET = 360
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBoardPlace', 'none',
        '-uiVerifyBoardView', 'map']
COVER = 'bounty-map-cover'
EXPAND = 'bounty-map-expand'
LOCATE = 'bounty-map-locate'
CHIPS = ['bounty-filter-all', 'bounty-filter-urgent', 'bounty-filter-fits']
FIRST = 'fixture-bounty-01'
FIRST_TITLE = '帮取快递'
CORNER = 24
EDGE = 1
STATUS_BAR = 44

ui = UI(*sys.argv[1:])


def close_button(items):
    label = ui.t('bounty.board.map.close')
    return next((i for i in items if i.get('type') == 'Button' and i.get('AXLabel') == label), None)


def chip(identifier):
    return (ui.element(identifier) or {}).get('AXLabel') or ''


def expand_cover():
    visible(ui, EXPAND)
    ui.tap(EXPAND)
    ui.element(COVER)
    ui.element(pin_id(FIRST))
    map_at_rest(ui)


def close_cover():
    button = ui.settled(close_button, 'no close button on the cover')
    ui.tap_point(button['frame']['x'] + button['frame']['width'] / 2,
                 button['frame']['y'] + button['frame']['height'] / 2)
    ui.gone(COVER)
    ui.element('bounty-board-map-view')


reach_home(ui)
ui.element(pin_id(FIRST))
expand = visible(ui, EXPAND)
assert expand.get('AXLabel') == ui.t('bounty.board.map.expand'), expand.get('AXLabel')
assert_touch_target(expand, 'the expand button')
embedded = by_id(ui.read(), MAP)['frame']
f = expand['frame']
assert inside(f, embedded), f'the expand button is not on the map: {f} against {embedded}'
assert embedded['x'] + embedded['width'] - (f['x'] + f['width']) <= CORNER and f['y'] - embedded['y'] <= CORNER, \
    f'the expand button is not at the top-right corner: {f} against {embedded}'
map_at_rest(ui)
ui.capture('01-embedded')

expand_cover()
items = ui.read()
s = screen(items)
m = by_id(items, MAP)['frame']
assert abs(m['x']) <= EDGE and abs(m['y']) <= EDGE and abs(m['width'] - s['width']) <= EDGE \
    and abs(m['height'] - s['height']) <= EDGE, f'the map does not fill the screen: {m} against {s}'
cover = by_id(items, COVER)['frame']
assert abs(cover['width'] - s['width']) <= EDGE and abs(cover['height'] - s['height']) <= EDGE, \
    f'the cover does not fill the screen: {cover}'
assert pins(items), 'no pins on the full-screen map'
for identifier in CHIPS:
    found = by_id(items, identifier)
    assert found, f'{identifier} is missing on the cover'
    assert_touch_target(found, identifier)
    assert STATUS_BAR <= found['frame']['y'] <= s['height'] / 3, \
        f'{identifier} does not float at the top under the safe area: {found["frame"]}'
close = close_button(items)
assert close, 'no close button read as 关闭地图'
# A system toolbar button reports its 36 pt glyph to AX; UIKit owns its hit area, so the tap in close_cover proves it.
assert close['frame']['x'] < s['width'] / 2 and close['frame']['y'] < s['height'] / 4, \
    f'the close button is not top-left: {close["frame"]}'
locate = ui.element(LOCATE)
assert locate['frame']['x'] > s['width'] / 2 and locate['frame']['y'] > s['height'] / 2, \
    f'the location button is not bottom-right: {locate["frame"]}'
assert by_id(items, EXPAND) is None, 'the full-screen map still offers expand'
ui.capture('02-cover')

front = tap_pin(ui, FIRST)
map_at_rest(ui)
assert FIRST_TITLE in (front.get('AXLabel') or ''), f'the card front reads {front.get("AXLabel")!r}'
assert_touch_target(ui.element('map-card-apply'), '申请 on the full-screen card')
face = face_box(ui, FRONT, ['map-card-apply'])
assert inside(face, s), f'the card leaves the screen: {face}'
lowest_chip = max(by_id(ui.read(), c)['frame']['y'] + by_id(ui.read(), c)['frame']['height'] for c in CHIPS)
assert face['y'] >= lowest_chip - EDGE, f'the card runs under the chips: {face} above {lowest_chip}'
ui.capture('03-card')
close_card(ui)

ui.tap('bounty-filter-urgent')
ui.wait(lambda items: (by_id(items, 'bounty-filter-all') or {}).get('AXLabel') == ui.t('bounty.board.filter.all'),
        '急 did not apply on the cover')
map_at_rest(ui)
ui.capture('04-cover-urgent')
close_cover()
assert chip('bounty-filter-all') == ui.t('bounty.board.filter.all'), \
    f'closing the cover lost 急: 全部 reads {chip("bounty-filter-all")}'
assert by_id(ui.read(), 'bounty-board-map-view'), 'closing the cover did not return to the map view'
map_at_rest(ui)
ui.capture('05-closed-urgent')
visible(ui, 'bounty-filter-all')
ui.tap('bounty-filter-all')
ui.element(pin_id(FIRST))

expand_cover()
tap_pin(ui, FIRST)
ui.tap(FRONT)
ui.element(BACK)
ui.tap('map-card-details')
ui.element('bounty-detail-title', timeout=40)
assert by_id(ui.read(), COVER) is None, 'the cover is still up over the detail'
ui.capture('06-detail')
print('PASS: 44 pt expand at the map corner, edge-to-edge cover with chips, close and location button, pin card on '
      'the cover, 急 shared with the board after closing, 看详情 dismisses the cover and pushes the detail')
