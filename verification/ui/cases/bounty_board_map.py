"""The map view (Debug scene `bounty-map`, the production BoardMap fed by the fixture board, because the board switch
lands in Task 5): every located bounty is a pin read by VoiceOver as 「{title}，{reward}」; tapping 帮取快递 grows a
card on the card fill out of the pin with its tail at the pin, while the pin stays where it was; the front shows the
title, RM 8 and a 44 pt 申请, which opens the apply sheet; tapping the card flips it to the back with 看详情 and 申请,
and 看详情 pushes the 3A detail; tapping empty map closes the card, and so does a pan. The `long` board shows
「地图上 20 / 45 · 再显示 20 个」, which loads the next page into the map."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from apply import title_shown  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from map import (BACK, FRONT, assert_card_surface, assert_tail, centre, close_card, face_box, inside,  # noqa: E402
                 map_at_rest, map_frame, open_scene, pin_id, pin_title, pins, tap_pin)

DEPS = ['src/features/bounty/map/', 'src/features/bounty/board/', 'src/debug/BoardMapScene.tsx',
        'modules/tapiro-kit/ios/BountyMapView.swift', 'modules/tapiro-kit/ios/BountyPinView.swift',
        'verification/ui/map.py', 'verification/ui/apply.py']
SCENE = 'bounty-map'
BUDGET = 360
ARGS = ['-uiVerifySignedIn', 'onboarded']
FIRST = 'fixture-bounty-01'
FIRST_TITLE = '帮取快递'
NEAR_PINS = 7
PAGE = 20

ui = UI(*sys.argv[1:])


def first_card():
    open_scene(ui, ready=pin_id(FIRST))
    map_at_rest(ui)
    before = ui.settled(lambda items: by_id(items, pin_id(FIRST)), 'the first pin never settled')
    front = tap_pin(ui, FIRST)
    map_at_rest(ui)
    return before, front


ui.element('ui-verify-ready')
first = ui.settled(lambda items: by_id(items, pin_id(FIRST)), 'the first pin never appeared')
items = ui.read()
shown = pins(items)
assert len(shown) >= NEAR_PINS, f'only {len(shown)} pins are on the map: {[p["AXUniqueId"] for p in shown]}'
assert pin_title(ui, first.get('AXLabel') or '') == FIRST_TITLE, first.get('AXLabel')
assert re.search(r'RM\s?8$', first['AXLabel']), f'the pin does not end with RM 8: {first["AXLabel"]!r}'
ui.capture('01-pins')

before, front = first_card()
after = by_id(ui.read(), pin_id(FIRST))
assert after and abs(centre(after['frame'])[0] - centre(before['frame'])[0]) < 1 \
    and abs(centre(after['frame'])[1] - centre(before['frame'])[1]) < 1, 'the map moved when the card opened'
assert FIRST_TITLE in (front.get('AXLabel') or ''), f'the card front reads {front.get("AXLabel")!r}'
apply = ui.element('map-card-apply')
assert_touch_target(apply, '申请 on the card')
face = face_box(ui, FRONT, ['map-card-apply'])
assert inside(face, map_frame(ui)), f'the card leaves the map: {face}'
shot = ui.snap('02-card-front')
assert_card_surface(ui, shot, face, 'card front')
side = 'above' if face['y'] + face['height'] <= before['frame']['y'] + 2 else 'below'
assert_tail(ui, shot, face, centre(before['frame'])[0], side, 'card front')

ui.tap('map-card-apply')
title_shown(ui, 'bounty.apply.title')
ui.capture('03-apply-sheet')

first_card()
ui.tap(FRONT)
back = ui.settled(lambda items: by_id(items, BACK), 'the card never flipped to the back')
ui.gone(FRONT)
assert FIRST_TITLE in (back.get('AXLabel') or ''), back.get('AXLabel')
details = ui.element('map-card-details')
assert details.get('AXLabel') == ui.t('bounty.board.map.details'), details.get('AXLabel')
assert_touch_target(details, '看详情')
assert_touch_target(ui.element('map-card-back-apply'), '申请 on the back')
map_at_rest(ui)
back_face = face_box(ui, BACK, ['map-card-details', 'map-card-back-apply'])
assert_card_surface(ui, ui.snap('04-card-back'), back_face, 'card back')
ui.tap(BACK)
ui.settled(lambda items: by_id(items, FRONT), 'the card never flipped back to the front')
ui.gone(BACK)
ui.tap(FRONT)
ui.element(BACK)
ui.tap('map-card-details')
ui.element('bounty-detail-title', timeout=40)
ui.capture('05-detail')

first_card()
close_card(ui)
assert by_id(ui.read(), pin_id(FIRST)), 'the pin vanished with the card'
ui.capture('06-closed')
tap_pin(ui, FIRST)
m = map_frame(ui)
y = m['y'] + m['height'] * 0.85
ui.swipe((m['x'] + m['width'] * 0.7, y), (m['x'] + m['width'] * 0.3, y), 0.4)
ui.gone(FRONT)
ui.capture('07-panned')

open_scene(ui, '-uiVerifyBoard', 'long', ready='bounty-map-more')
more = ui.wait_label('bounty-map-more', lambda label: label == ui.t('bounty.board.map.more', shown=PAGE, total=45,
                                                                    count=PAGE),
                     'the chip does not read 20 / 45 · 再显示 20 个')
assert_touch_target(more, 'the more chip')
ui.capture('08-more')
ui.tap('bounty-map-more')
ui.wait_label('bounty-map-more', lambda label: label == ui.t('bounty.board.map.more', shown=2 * PAGE, total=45,
                                                             count=5),
              'the chip does not read 40 / 45 · 再显示 5 个 after one page')
ui.tap('bounty-map-more')
ui.gone('bounty-map-more')
ui.capture('09-all')
print(f'PASS: {len(shown)} pins, card front and back with tail, apply sheet, 看详情 → detail, closes on tap and pan, '
      'more chip pages 20 → 40 → all')
