"""Worst-case map (break-ui; Debug scene `bounty-map` with `-uiVerifyBoard worst`, the board switch lands in Task 5):
each pin's VoiceOver label carries the whole 60-code-point title and the reward; the card for the 100 m bounty stays
inside the map, wraps the title to at most two lines, shows RM 500 in full and a 44 pt 申请; its back keeps 看详情 and
申请 side by side at 44 pt inside the card (the `ms` labels are the longest); the applied bounty at 1.8 km, near the
map's top edge, opens a card that still fits on the map and shows 已申请 · 等对方选 instead of 申请."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from map import (BACK, FRONT, close_card, face_box, inside, map_at_rest, map_frame, pin_id, pin_title,  # noqa: E402
                 pins, tap_pin)
from ocr import find, lines  # noqa: E402

DEPS = ['src/features/bounty/map/', 'src/features/bounty/board/fixtureBoardData.ts', 'src/debug/BoardMapScene.tsx',
        'modules/tapiro-kit/ios/BountyPinView.swift', 'verification/ui/map.py', 'verification/ui/ocr.py',
        'verification/ui/ocr.swift']
SCENE = 'bounty-map'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 360
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBoard', 'worst', '-uiVerifyFixture', 'worst']
TOP, APPLIED = 'fixture-worst-01', 'fixture-worst-02'
TITLE_LENGTH = 60

ui = UI(*sys.argv[1:])


READ = {}


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
ui.capture('01-pins')

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
