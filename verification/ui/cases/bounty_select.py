"""Hold to choose 阿杰 (50A, 51A, 52A): a 0.4 s hold fills the gold from the left edge, the release runs it back within
the 200 ms run-back and nothing is sent; a 1.5 s hold fills the track in about 1 s, linear, with the label drawn ink on
the gold left of the edge and in the track tone right of it, then stays full gold with 正在选… through the send; the
screen becomes 选好了阿杰 with 阿杰 as one row and the address A 座 12-03, and the fixture recorded exactly one select,
for 阿杰. Timing comes from the frames of hold-early.mp4 and hold-full.mp4."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from choose import (  # noqa: E402
    HOLD, JIE, analyse, assert_none_selected, assert_one_selected, choose, hold_reads, label_split,
    row_id,
)
from driver import UI, assert_colour, by_id, token  # noqa: E402
from recording import clip  # noqa: E402

DEPS = ['src/features/bounty/select/', 'src/ui/HoldButton.tsx', 'src/app/(tabs)/bounty/', 'verification/ui/choose.py']
SCENE = 'bounty-applicants'
ARGS = ['-uiVerifySignedIn', 'onboarded']
BUDGET = 360
EARLY_S, FULL_S = 0.4, 1.5
FILL_S, RUN_BACK_S, SLACK_S = 1.0, 0.2, 0.15
LIT, FULL = 0.03, 0.97
SPLIT_MIN = 20

ui = UI(*sys.argv[1:])


def points_wide():
    return ui.read()[0]['frame']['width']


def lit_span(samples):
    lit = [i for i, (_, p, _) in enumerate(samples) if p > LIT]
    assert lit, f'the gold never showed: {[(round(t, 2), round(p, 2)) for t, p, _ in samples]}'
    return lit[0], lit[-1]


def trace(samples):
    return ', '.join(f'{t:.2f}s={p:.2f}' for t, p, _ in samples)


label = ui.t('bounty.select.hold.label', name='阿杰')
f = choose(ui, JIE, '阿杰')
wide = points_wide()

with clip(ui, 'hold-early') as early:
    ui.press_at(f, EARLY_S)
    time.sleep(1.0)  # the run-back has to land inside the clip
hold_reads(ui, label)
samples = analyse(early, f, wide, ui.appearance)
print(f'early release: {trace(samples)}')
first, last = lit_span(samples)
peak = max(range(first, last + 1), key=lambda i: samples[i][1])
assert 0.15 <= samples[peak][1] <= 0.75, f'a {EARLY_S} s hold peaked at {samples[peak][1]:.2f}, not near 0.4'
assert samples[first][1] < samples[peak][1], 'the gold did not grow during the early hold'
assert all(samples[i][1] <= samples[i + 1][1] + 0.02 for i in range(first, peak)), 'the gold shrank while held'
assert last < len(samples) - 1, f'the gold is still showing at the end of the clip ({samples[-1][1]:.2f})'
back = samples[last + 1][0] - samples[peak][0]
assert back <= RUN_BACK_S + 2 * SLACK_S, f'the run-back took {back:.2f} s, expected about {RUN_BACK_S} s'
assert_none_selected(ui, f'a {EARLY_S} s hold')
ui.capture('01-released')

with clip(ui, 'hold-full') as full:
    ui.press_at(f, FULL_S)
    hold_reads(ui, ui.t('bounty.select.hold.sending'))
    shot = ui.snap('02-sending')
    for x in (f['x'] + 40, f['x'] + f['width'] - 52):
        assert_colour(shot, {'x': x, 'y': f['y'] + f['height'] - 18, 'width': 12, 'height': 8},
                      token('--color-hold-fill', ui.appearance), 'busy gold', tolerance=12)
    ui.wait_label('bounty-select-done', lambda text: text == ui.t('bounty.select.done.title', name='阿杰'),
                  'the screen never became 选好了阿杰')

centre = f['x'] + f['width'] / 2
split = {}


def keep(shot, progress):
    edge = f['x'] + progress * f['width']
    if 0.3 < progress < 0.7 and abs(edge - centre) < abs(split.get('edge', 1e9) - centre):
        split.update(edge=edge, counts=label_split(shot, f, edge, ui.appearance))


samples = analyse(full, f, wide, ui.appearance, keep)
print(f'full hold: {trace(samples)}')
first, _ = lit_span(samples)
filled = next((i for i, (_, p, _) in enumerate(samples) if p >= FULL), None)
assert filled is not None, 'the gold never reached the end of the track'
partial = [i for i in range(first, filled) if 0.1 < samples[i][1] < 0.9]
assert len(partial) >= 2, f'too few frames caught the fill moving: {partial}'
a, b = partial[0], partial[-1]
assert samples[b][0] > samples[a][0] and samples[b][1] > samples[a][1] + 0.2, \
    f'the edge did not move right: {samples[a][:2]} then {samples[b][:2]}'
took = samples[filled][0] - samples[first - 1 if first else first][0]
assert abs(took - FILL_S) <= 2 * SLACK_S, f'the fill took {took:.2f} s, expected {FILL_S} s'
rate = [(samples[i + 1][1] - samples[i][1]) / max(samples[i + 1][0] - samples[i][0], 1e-3) for i in partial[:-1]]
print(f'fill took {took:.2f} s; rate per s across the partial frames: {[round(r, 2) for r in rate]}')
held = [p for t, p, _ in samples[filled:] if t <= samples[filled][0] + 1.5]
assert held and min(held) >= FULL, f'the gold ran back during the send: {held}'

assert 'counts' in split, 'no frame caught the edge across the label'
left, right = split['counts']
print(f'label split at {split["edge"]:.0f} pt: left {left}, right {right}')
assert left['--color-hold-fill'] > SPLIT_MIN and left['--color-on-hold-fill'] > SPLIT_MIN, \
    f'left of the edge is not ink on gold: {left}'
assert right['--color-hold-fill'] <= 4, f'gold leaks right of the edge: {right}'
assert right['--color-on-hold-track'] > SPLIT_MIN, f'right of the edge has no track-tone label: {right}'
if token('--color-on-hold-track', ui.appearance) != token('--color-on-hold-fill', ui.appearance):
    assert left['--color-on-hold-track'] <= 4, f'the track-tone label shows on the gold: {left}'

items = ui.read()
assert by_id(items, HOLD) is None, 'the hold button is still shown after choosing'
assert by_id(items, row_id(JIE)) is None, 'the applicant list is still shown after choosing'
row = ui.element('bounty-select-done-row')
assert '阿杰' in (row.get('AXLabel') or ''), f'the chosen row reads {row.get("AXLabel")!r}'
address = ui.element('bounty-select-done-address')
assert 'A 座 12-03' in (address.get('AXLabel') or ''), f'the address reads {address.get("AXLabel")!r}'
assert ui.t('bounty.select.done.addressRow') in address['AXLabel'], address['AXLabel']
ui.labelled(ui.t('bounty.select.done.addressFooter', name='阿杰'))
assert_one_selected(ui, JIE)
ui.at_rest()
ui.capture('03-done')
print('PASS: early release sends nothing, the fill grows from the left and runs back, the full hold sends once, 选好了阿杰')
