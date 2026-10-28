"""Distance axis (27A, 35A, 40A): from 你 the axis marks the located bounties within 2 km as 44 pt stickers labelled with
their titles and distance, merging neighbours closer than 44 pt; tapping the 1.6 km sticker scrolls 搬两个箱子上楼 from
below the screen into view and a 2 pt accent ring shows around it once, then goes; 「+2 更远」 does the same for 帮我去 JPJ
排号. The ring is timed from the frame timestamps of a clip recorded around each tap (ring-move.mp4, ring-jpj.mp4)."""
import re
import sys
import tempfile
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import BOTTOM_CLEAR, in_view, ink_box, screen, visible  # noqa: E402
from driver import UI, Shot, assert_touch_target, by_id, reach_home, token  # noqa: E402
from recording import clip, frames  # noqa: E402

DEPS = ['src/features/bounty/', 'src/features/home/', 'src/app/(tabs)/', 'verification/ui/board.py']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBoardPlace', 'none']
MARK = 'bounty-axis-mark-fixture-bounty-06'
MOVE_CARD = 'bounty-card-fixture-bounty-06'
JPJ_CARD = 'bounty-card-fixture-bounty-08'
RING_MIN = 70
RING_WIDTH = 2
WATCH_S = 5.0
FRAME_GAP_S = 0.03
RING_MS = 150 + 1200 + 240
SPAN_MIN, SPAN_MAX = 0.75, RING_MS / 1000 + 0.25

ui = UI(*sys.argv[1:])


def ring_pixels(shot, f):
    accent = token('--color-accent', ui.appearance)
    bands = [
        {'x': f['x'] - 5, 'y': f['y'] + 24, 'width': 4, 'height': f['height'] - 48},
        {'x': f['x'] + 24, 'y': f['y'] - 5, 'width': f['width'] - 48, 'height': 4},
    ]
    counts = []
    for band in bands:
        box = ink_box(shot, band, accent, 24)
        length = max(band['width'], band['height']) * shot.scale
        stroke = RING_WIDTH * shot.scale
        counts.append(box['count'] / (length * stroke) if box else 0)
    return round(min(counts) * 100)


def tap_and_watch(target, card_id, tag):
    items = ui.read()
    s = screen(items)
    before = by_id(items, card_id)
    assert before, f'{card_id} is not loaded'
    assert before['frame']['y'] >= s['height'] - BOTTOM_CLEAR, \
        f'{card_id} is already on screen at y={before["frame"]["y"]} before the tap'
    f = ui.settled(lambda items: by_id(items, target), f'{target} never settled')['frame']
    with clip(ui, f'ring-{tag}') as video:
        ui.axe('tap', '-x', str(round(f['x'] + f['width'] / 2)), '-y', str(round(f['y'] + f['height'] / 2)))
        time.sleep(WATCH_S)
    card = ui.settled(lambda items: by_id(items, card_id), f'{card_id} never settled')
    assert in_view(card, screen(ui.read())), f'{card_id} is not in view after the tap: {card["frame"]}'
    with tempfile.TemporaryDirectory() as tmp:
        counts = [(ring_pixels(Shot(path, s['width']), card['frame']), at)
                  for path, at in frames(video, tmp, FRAME_GAP_S)]
    print(f'{tag} ring pixels by video time: ' + ', '.join(f'{t:.2f}s={c}' for c, t in counts))
    lit = [c >= RING_MIN for c, _ in counts]
    assert any(lit), f'no accent ring around {card_id} after the scroll: {counts}'
    first, last = lit.index(True), len(lit) - 1 - lit[::-1].index(True)
    assert all(lit[first:last + 1]), f'the ring around {card_id} showed more than once: {counts}'
    assert last < len(lit) - 1, f'the ring around {card_id} is still there at the end of the clip ({counts[-1][1]:.2f}s)'
    span = counts[last][1] - counts[first][1]
    assert SPAN_MIN <= span <= SPAN_MAX, \
        f'the ring around {card_id} showed for {span:.2f}s, expected {SPAN_MIN}-{SPAN_MAX:.2f}s ({RING_MS} ms)'
    print(f'{tag} ring span {span:.2f}s')
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
