"""Worst-case map (break-ui; Debug scene `bounty-map` with `-uiVerifyBoard worst`, the board switch lands in Task 5):
each pin's VoiceOver label carries the whole 60-code-point title and the reward; the card for the 100 m bounty stays
inside the map, wraps the title to at most two lines, shows RM 500 in full and a 44 pt 申请; its back keeps 看详情 and
申请 side by side at 44 pt inside the card (the `ms` labels are the longest); the applied bounty at 1.8 km, near the
map's top edge, opens a card that still fits on the map and shows 已申请 · 等对方选 instead of 申请; its pin (84A) wears the
list's 已申请 stamp in the success colour under the sticker and VoiceOver reads 已申请，等对方选 after the reward, while
no other pin carries a stamp."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import ink_box  # noqa: E402
from driver import UI, assert_touch_target, by_id, token  # noqa: E402
from map import (BACK, DISC, FRONT, close_card, disc_centre, face_box, inside, map_at_rest, map_frame,  # noqa: E402
                 pin_id, pin_title, pins, tap_pin)
from ocr import find, lines  # noqa: E402

DEPS = ['src/features/bounty/map/', 'src/features/bounty/board/fixtureBoardData.ts', 'src/debug/BoardMapScene.tsx',
        'modules/tapiro-kit/ios/BountyPinView.swift', 'verification/ui/map.py', 'verification/ui/ocr.py',
        'verification/ui/ocr.swift', 'verification/ui/board.py', 'src/features/bounty/shared/justApplied.ts']
SCENE = 'bounty-map'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 360
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBoard', 'worst', '-uiVerifyFixture', 'worst']
TOP, APPLIED = 'fixture-worst-01', 'fixture-worst-02'
TITLE_LENGTH = 60
STAMP_MIN, STAMP_STRAY = 60, 8
STAMP_REACH = 14

ui = UI(*sys.argv[1:])


READ = {}


def stamp_area(pin):
    x, y = disc_centre(pin['frame'])
    return {'x': x - DISC / 2 - STAMP_REACH, 'y': y - DISC / 2, 'width': DISC + 2 * STAMP_REACH,
            'height': DISC + STAMP_REACH}


def overlaps(a, b):
    return not (a['x'] + a['width'] <= b['x'] or b['x'] + b['width'] <= a['x']
                or a['y'] + a['height'] <= b['y'] or b['y'] + b['height'] <= a['y'])


def stamp_ink(shot, pin):
    found = ink_box(shot, stamp_area(pin), token('--color-success', ui.appearance), 6)
    return found['count'] if found else 0


def in_card(shot, box, pattern, what):
    if shot.path not in READ:
        READ[shot.path] = lines(shot)
    read = READ[shot.path]
    found = find(read, pattern, box)
    assert found, f'{what} ({pattern}) is not shown in full inside the card: {[line["text"] for line in read]}'
    return found


ui.element('ui-verify-ready')
ui.settled(lambda items: by_id(items, pin_id(TOP)), 'the worst pins never appeared')
map_at_rest(ui)
items = ui.read()
m = map_frame(ui)
for pin in pins(items):
    title = pin_title(ui, pin.get('AXLabel') or '')
    assert len(title) == TITLE_LENGTH, f'{pin["AXUniqueId"]} reads a cut title ({len(title)}): {title!r}'
    assert re.search(r'(RM|¥)\s?\d', pin['AXLabel']), f'{pin["AXUniqueId"]} reads no reward: {pin["AXLabel"]!r}'
applied_said = ui.t('bounty.board.card.separator') + ui.t('bounty.board.card.applied')
shot = ui.snap('01-pins')
applied_pin = by_id(items, pin_id(APPLIED))
assert applied_pin, 'the applied pin is not on the map'
assert (applied_pin.get('AXLabel') or '').endswith(applied_said), \
    f'VoiceOver does not read the applied state on the pin: {applied_pin.get("AXLabel")!r}'
stamped = stamp_ink(shot, applied_pin)
print(f'applied pin stamp: {stamped} success px')
assert stamped >= STAMP_MIN, f'the applied pin wears no 已申请 stamp ({stamped} success px)'
for pin in pins(items):
    if pin['AXUniqueId'] == pin_id(APPLIED) or overlaps(stamp_area(pin), stamp_area(applied_pin)):
        continue
    assert not (pin.get('AXLabel') or '').endswith(applied_said), f'{pin["AXUniqueId"]} reads as applied'
    stray = stamp_ink(shot, pin)
    assert stray <= STAMP_STRAY, f'{pin["AXUniqueId"]} carries a stamp ({stray} success px)'

tap_pin(ui, TOP)
map_at_rest(ui)
apply = ui.element('map-card-apply')
assert_touch_target(apply, '申请 on the worst card')
face = face_box(ui, FRONT, ['map-card-apply'])
assert inside(face, m), f'the worst card leaves the map: {face} / {m}'
shot = ui.snap('02-front')
reward = in_card(shot, face, r'RM\s?500', 'RM 500')[0]
title = in_card(shot, face, '帮我从', 'the title')[0]
assert title['y'] + title['height'] <= reward['y'] + 1 or title['x'] + title['width'] <= reward['x'] + 1, \
    f'the title runs into RM 500: {title} / {reward}'

ui.tap(FRONT)
ui.settled(lambda items: by_id(items, BACK), 'the worst card never flipped')
map_at_rest(ui)
items = ui.read()
details, back_apply = by_id(items, 'map-card-details'), by_id(items, 'map-card-back-apply')
assert details and back_apply, 'the back lost 看详情 or 申请'
assert_touch_target(details, '看详情')
assert_touch_target(back_apply, '申请 on the back')
back = face_box(ui, BACK, ['map-card-details', 'map-card-back-apply'])
assert inside(back, m), f'the back leaves the map: {back}'
d, a = details['frame'], back_apply['frame']
assert d['x'] + d['width'] <= a['x'] + 1, f'看详情 overlaps 申请: {d} / {a}'
assert abs(d['y'] - a['y']) < 1, f'看详情 and 申请 are not side by side: {d} / {a}'
shot = ui.snap('03-back')
in_card(shot, back, re.escape(ui.t('bounty.board.map.details')).replace('\\ ', r'\s?'), '看详情')
close_card(ui)

ui.settled(lambda items: by_id(items, pin_id(APPLIED)), 'the applied pin is not on the map')
tap_pin(ui, APPLIED)
map_at_rest(ui)
items = ui.read()
assert by_id(items, 'map-card-apply') is None, 'the applied card still offers 申请'
applied = ui.element('map-card-applied')
assert applied.get('AXLabel') == ui.t('bounty.board.applied'), applied.get('AXLabel')
face = face_box(ui, FRONT, ['map-card-applied'])
assert inside(face, m), f'the applied card leaves the map: {face}'
shot = ui.snap('04-applied')
tail = re.escape(ui.t('bounty.board.applied').split('·')[-1].strip())
status = in_card(shot, face, tail, 'the applied line')[0]
assert not re.search(r'…|\.\.\.$', status['text']), f'the applied line is truncated: {status["text"]!r}'
print(f'PASS: {len(pins(items))} worst pins read in full, front and back fit with 44 pt actions, applied card fits')
