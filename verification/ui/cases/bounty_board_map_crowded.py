"""Crowded map (Debug scene `bounty-map` with `-uiVerifyBoard crowded`; the board switch lands in Task 5): the six
bounties that share one snapped point fan out on the 26 pt ring, each keeps a visible part that opens its own card, and
the four near ones are tappable too. Zoomed out (`-uiVerifyMapRadius 8000`, half the short edge past 3 km) the
stickers shrink to dots and the white category labels above them are gone, while every pin stays on the map."""
import math
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from map import FRONT, centre, close_card, label_white, open_scene, pin_id, pin_title, pins, tap_pin  # noqa: E402

DEPS = ['src/features/bounty/map/', 'src/features/bounty/board/fixtureBoardData.ts', 'src/debug/BoardMapScene.tsx',
        'modules/tapiro-kit/ios/BountyMapView.swift', 'modules/tapiro-kit/ios/BountyPinView.swift',
        'verification/ui/map.py']
SCENE = 'bounty-map'
BUDGET = 420
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBoard', 'crowded']
CELL = [f'fixture-crowded-{n:02d}' for n in range(1, 7)]
NEAR = [f'fixture-crowded-{n:02d}' for n in range(7, 11)]
OUTWARD = 20
FAN_MIN = 20

ui = UI(*sys.argv[1:])


def frames(ids):
    items = ui.read()
    found = {i: by_id(items, pin_id(i)) for i in ids}
    missing = [i for i, f in found.items() if not f]
    assert not missing, f'pins missing from the map: {missing}'
    return found


def open_by_point(row_id, x, y, title):
    ui.tap_point(x, y)
    front = ui.settled(lambda items: by_id(items, FRONT), f'tapping {row_id} at {x:.0f},{y:.0f} opened no card')
    assert title in (front.get('AXLabel') or ''), \
        f'tapping {row_id} opened another bounty: {front.get("AXLabel")!r} (expected {title})'
    close_card(ui)


ui.element('ui-verify-ready')
ui.settled(lambda items: by_id(items, pin_id(CELL[0])), 'the crowded pins never appeared')
ui.at_rest()
cell = frames(CELL)
discs = {i: (centre(f['frame'])[0], f['frame']['y'] + f['frame']['height'] - 22) for i, f in cell.items()}
mx = sum(x for x, _ in discs.values()) / len(discs)
my = sum(y for _, y in discs.values()) / len(discs)
spread = [math.hypot(x - mx, y - my) for x, y in discs.values()]
print(f'fan radii {[round(r, 1) for r in spread]}')
assert min(spread) >= FAN_MIN, f'the same-point pins are not fanned out: {spread}'
shot = ui.snap('01-crowded')

for row_id in CELL:
    x, y = discs[row_id]
    r = math.hypot(x - mx, y - my)
    tx, ty = x + (x - mx) / r * OUTWARD, y + (y - my) / r * OUTWARD
    open_by_point(row_id, tx, ty, pin_title(ui, cell[row_id]['AXLabel']))
ui.capture('02-cell-tapped')

near = frames(NEAR)
for row_id, pin in near.items():
    front = tap_pin(ui, row_id)
    assert pin_title(ui, pin['AXLabel']) in (front.get('AXLabel') or ''), front.get('AXLabel')
    close_card(ui)

close_shot = ui.snap('03-near-labels')
near_white = [label_white(close_shot, pin) for pin in frames(NEAR + CELL[:1]).values()]

open_scene(ui, '-uiVerifyMapRadius', '8000', ready=pin_id(CELL[0]))
ui.at_rest()
far = frames(CELL + NEAR)
far_shot = ui.snap('04-zoomed-out')
far_white = [label_white(far_shot, pin) for pin in far.values()]
print(f'label white near {near_white}, far {far_white}')
assert sum(band for band, _ in near_white) > 4 * max(1, sum(beside for _, beside in near_white)), \
    f'no white labels above the pins up close: {near_white}'
assert sum(band for band, _ in far_white) <= 2 * max(1, sum(beside for _, beside in far_white)) + 20, \
    f'the labels still show zoomed out: {far_white}'
assert len(pins(ui.read())) >= len(CELL) + len(NEAR), 'pins were hidden when zoomed out'
print('PASS: six same-point pins fanned and each opens its own card, four near pins tappable, labels hide zoomed out')
