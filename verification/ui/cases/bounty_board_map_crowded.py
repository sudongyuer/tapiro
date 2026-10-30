"""Crowded map (Debug scene `bounty-map` with `-uiVerifyBoard crowded`; the board switch lands in Task 5): the six
bounties that share one snapped point fan out on the 26 pt ring and each keeps a visible part (inside its own disc
or label, outside every other sticker's disc and label) that opens its own card; the four near ones, about 2.2 km
away, are reached the same way. Zoomed out (`-uiVerifyMapRadius 8000`, half the short edge past 3 km) the
stickers shrink to dots and the white category labels above them are gone, while every pin stays on the map."""
import math
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from map import (FRONT, centre, close_card, label_white, location_dots, map_at_rest, open_scene,  # noqa: E402
                 pin_id, pin_title, pins)

DEPS = ['src/features/bounty/map/', 'src/features/bounty/board/fixtureBoardData.ts', 'src/debug/BoardMapScene.tsx',
        'modules/tapiro-kit/ios/BountyMapView.swift', 'modules/tapiro-kit/ios/BountyPinView.swift',
        'verification/ui/map.py']
SCENE = 'bounty-map'
BUDGET = 420
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBoard', 'crowded']
CELL = [f'fixture-crowded-{n:02d}' for n in range(1, 7)]
NEAR = [f'fixture-crowded-{n:02d}' for n in range(7, 11)]
DISC = 44
LABEL_TOP = 6
LABEL_WIDTH = 44
CLEARANCE = 3
DOT_REACH = 14
WHITE = 250
FAN_MIN = 20

ui = UI(*sys.argv[1:])


def frames(ids):
    items = ui.read()
    found = {i: by_id(items, pin_id(i)) for i in ids}
    missing = [i for i, f in found.items() if not f]
    assert not missing, f'pins missing from the map: {missing}'
    return found


def shapes(f):
    cx = centre(f)[0]
    disc = (cx, f['y'] + f['height'] - DISC / 2)
    label = {'x': cx - LABEL_WIDTH / 2, 'y': f['y'] + LABEL_TOP, 'width': LABEL_WIDTH,
             'height': f['height'] - DISC}
    return disc, label


def gap(x, y, f):
    (dx, dy), label = shapes(f)
    to_disc = math.hypot(x - dx, y - dy) - DISC / 2
    ox = max(label['x'] - x, 0, x - label['x'] - label['width'])
    oy = max(label['y'] - y, 0, y - label['y'] - label['height'])
    to_label = math.hypot(ox, oy) if ox or oy else -min(x - label['x'], label['x'] + label['width'] - x,
                                                        y - label['y'], label['y'] + label['height'] - y)
    return min(to_disc, to_label)


def uncovered_point(row_id, found):
    own = found[row_id]['frame']
    others = [p['frame'] for i, p in found.items() if i != row_id]
    best, clearance = None, -math.inf
    for y in range(round(own['y']), round(own['y'] + own['height'])):
        for x in range(round(own['x']), round(own['x'] + own['width'])):
            room = min(-gap(x, y, own), *(gap(x, y, o) for o in others))
            if room > clearance:
                best, clearance = (x, y), room
    print(f'{row_id}: tap {best}, {clearance:.1f} pt clear of the others')
    assert clearance >= CLEARANCE, \
        f'{row_id} has no part left that no other sticker covers (best {best}, {clearance:.1f} pt clear)'
    return best


def location_dot(items):
    return [(*centre(f), max(f['width'], f['height']) / 2 + DOT_REACH / 2) for f in location_dots(items)]


def masked_white(shot, f, dots):
    band = {'x': f['x'] + 4, 'y': f['y'] + 2, 'width': f['width'] - 8, 'height': f['height'] - DISC - 6}
    counts = []
    for box in (band, {**band, 'x': band['x'] - band['width'] - 24}):
        white = 0
        for j in range(round(box['height'] * 2)):
            for i in range(round(box['width'] * 2)):
                x, y = box['x'] + i / 2, box['y'] + j / 2
                if all(math.hypot(x - dx, y - dy) >= r for dx, dy, r in dots) and min(shot.rgb(x, y)) >= WHITE:
                    white += 1
        counts.append(white)
    return tuple(counts)


def open_by_point(row_id, x, y, title):
    ui.tap_point(x, y)
    front = ui.settled(lambda items: by_id(items, FRONT), f'tapping {row_id} at {x:.0f},{y:.0f} opened no card')
    assert title in (front.get('AXLabel') or ''), \
        f'tapping {row_id} opened another bounty: {front.get("AXLabel")!r} (expected {title})'
    close_card(ui)


ui.element('ui-verify-ready')
ui.settled(lambda items: by_id(items, pin_id(CELL[0])), 'the crowded pins never appeared')
map_at_rest(ui)
cell = frames(CELL)
discs = {i: (centre(f['frame'])[0], f['frame']['y'] + f['frame']['height'] - DISC / 2) for i, f in cell.items()}
mx = sum(x for x, _ in discs.values()) / len(discs)
my = sum(y for _, y in discs.values()) / len(discs)
spread = [math.hypot(x - mx, y - my) for x, y in discs.values()]
print(f'fan radii {[round(r, 1) for r in spread]}')
assert min(spread) >= FAN_MIN, f'the same-point pins are not fanned out: {spread}'
ui.capture('01-crowded')

found = {**cell, **frames(NEAR)}
for row_id in CELL + NEAR:
    tx, ty = uncovered_point(row_id, found)
    open_by_point(row_id, tx, ty, pin_title(ui, found[row_id]['AXLabel']))
ui.capture('02-cell-tapped')

close_shot = ui.snap('03-near-labels')
near_white = [label_white(close_shot, pin) for pin in frames(NEAR + CELL[:1]).values()]

open_scene(ui, '-uiVerifyMapRadius', '8000', ready=pin_id(CELL[0]))
# Zoomed out the dots no longer cover MapKit's user-location dot, whose halo pulses forever; wait on the pins instead.
for row_id in CELL + NEAR:
    ui.settled(lambda items, row_id=row_id: by_id(items, pin_id(row_id)), f'{row_id} never settled zoomed out')
far = frames(CELL + NEAR)
far_shot = ui.snap('04-zoomed-out')
dots = [(*shapes(pin['frame'])[0], DOT_REACH) for pin in far.values()] + location_dot(ui.read())
far_white = [masked_white(far_shot, pin['frame'], dots) for pin in far.values()]
print(f'label white near {near_white}, far {far_white}')
assert sum(band for band, _ in near_white) > 4 * max(1, sum(beside for _, beside in near_white)), \
    f'no white labels above the pins up close: {near_white}'
assert sum(band for band, _ in far_white) <= 2 * max(1, sum(beside for _, beside in far_white)) + 20, \
    f'the labels still show zoomed out: {far_white}'
assert len(pins(ui.read())) >= len(CELL) + len(NEAR), 'pins were hidden when zoomed out'
print('PASS: six same-point pins fanned and each opens its own card, four near pins tappable, labels hide zoomed out')
