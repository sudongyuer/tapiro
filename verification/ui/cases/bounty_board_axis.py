"""Distance axis (27A, 35A, 40A): from 你 the axis marks the located bounties within 2 km as 44 pt stickers labelled with
their titles and distance, merging neighbours closer than 44 pt; tapping the 1.6 km sticker scrolls 搬两个箱子上楼 from
below the screen into view and a 2 pt accent ring shows around it once, then goes; 「+2 更远」 does the same for 帮我去 JPJ
排号. The run video shows the scroll and the ring."""
import re
import subprocess
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import BOTTOM_CLEAR, in_view, ink_box, screen, visible  # noqa: E402
from driver import UI, Shot, assert_touch_target, by_id, reach_home, token  # noqa: E402

DEPS = ['src/features/bounty/', 'src/features/home/', 'src/app/(tabs)/', 'verification/ui/board.py']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBoardPlace', 'none']
MARK = 'bounty-axis-mark-fixture-bounty-06'
MOVE_CARD = 'bounty-card-fixture-bounty-06'
JPJ_CARD = 'bounty-card-fixture-bounty-08'
RING_MIN = 200
WATCH_S = 4.0

ui = UI(*sys.argv[1:])


def frame_shot(index, tag):
    path = ui.output / f'ring-{tag}-{index:02d}.png'
    subprocess.run(['xcrun', 'simctl', 'io', ui.udid, 'screenshot', str(path)],
                   check=True, timeout=20, capture_output=True)
    return path, time.monotonic()


def ring_pixels(shot, f):
    accent = token('--color-accent', ui.appearance)
    bands = [
        {'x': f['x'] - 5, 'y': f['y'] + 24, 'width': 4, 'height': f['height'] - 48},
        {'x': f['x'] + 24, 'y': f['y'] - 5, 'width': f['width'] - 48, 'height': 4},
    ]
    found = [ink_box(shot, band, accent, 24) for band in bands]
    return sum(box['count'] for box in found if box)


def tap_and_watch(target, card_id, tag):
    items = ui.read()
    s = screen(items)
    before = by_id(items, card_id)
    assert before, f'{card_id} is not loaded'
    assert before['frame']['y'] >= s['height'] - BOTTOM_CLEAR, \
        f'{card_id} is already on screen at y={before["frame"]["y"]} before the tap'
    f = ui.settled(lambda items: by_id(items, target), f'{target} never settled')['frame']
    ui.axe('tap', '-x', str(round(f['x'] + f['width'] / 2)), '-y', str(round(f['y'] + f['height'] / 2)))
    started = time.monotonic()
    shots = []
    while time.monotonic() - started < WATCH_S:
        shots.append(frame_shot(len(shots), tag))
    card = ui.settled(lambda items: by_id(items, card_id), f'{card_id} never settled')
    assert in_view(card, screen(ui.read())), f'{card_id} is not in view after the tap: {card["frame"]}'
    counts = [(ring_pixels(Shot(path, s['width']), card['frame']), at - started) for path, at in shots]
    print(f'{tag} ring pixels over time: ' + ', '.join(f'{t:.1f}s={c}' for c, t in counts))
    seen = [t for c, t in counts if c >= RING_MIN]
    assert seen, f'no accent ring around {card_id} after the scroll: {counts}'
    last_count, last_at = counts[-1]
    assert last_count < RING_MIN, f'the ring around {card_id} is still there {last_at:.1f}s after the tap'
    assert counts[-1][1] - seen[0] > 1.0, 'the ring vanished within a second'
    return card


reach_home(ui)
axis = visible(ui, 'bounty-axis')
expected = ui.t('bounty.board.axis.label', origin=ui.t('bounty.board.axis.you'))
assert axis.get('AXLabel') == expected, f'the axis reads {axis.get("AXLabel")!r}'

items = ui.read()
marks = [i for i in items if (i.get('AXUniqueId') or '').startswith('bounty-axis-mark-')]
assert marks, 'no stickers on the axis'
for mark in marks:
    assert_touch_target(mark, mark['AXUniqueId'])
    assert re.search(r'\d+(?:\.\d)?\s(?:m|km)', mark.get('AXLabel') or ''), mark.get('AXLabel')
join = ui.t('bounty.board.axis.titleJoin')
merged = [m for m in marks if join in (m.get('AXLabel') or '')]
assert merged, f'no neighbouring stickers merged: {[m.get("AXLabel") for m in marks]}'
xs = sorted(m['frame']['x'] for m in marks)
assert all(b - a >= 43.5 for a, b in zip(xs, xs[1:])), f'axis stickers overlap: {xs}'
move = by_id(items, MARK)
assert move and (move.get('AXLabel') or '').startswith('搬两个箱子上楼'), (move or {}).get('AXLabel')
assert re.search(r'1\.6\skm', move['AXLabel']), move['AXLabel']
more = ui.element('bounty-axis-more')
assert more.get('AXLabel') == ui.t('bounty.board.axis.moreLabel', count=2), more.get('AXLabel')
assert_touch_target(more, '+2 更远')
ui.at_rest()
ui.capture('01-axis')
print(f'{len(marks)} marks, {len(merged)} merged: {[m.get("AXLabel") for m in merged]}')

tap_and_watch(MARK, MOVE_CARD, 'move')
ui.capture('02-move-card')

visible(ui, 'bounty-axis-more')
ui.at_rest()
tap_and_watch('bounty-axis-more', JPJ_CARD, 'jpj')
ui.capture('03-jpj-card')
print('PASS: merged 44 pt stickers, 1.6 km and +2 更远 scroll to their cards and ring them once')
