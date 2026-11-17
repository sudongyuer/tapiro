"""小貘's speech bubble on the home stage, read from pixels: the bubble is hidden from the accessibility tree, since the
stage element carries its line."""
import re

import ocr
from driver import close, token

LEFT, TOP, TAIL, GAP, CAR = 16, 18, 8, 8, 30
POSE = {'urgent': (96, 58), 'live': (86, 54), 'calm': (96, 58)}
ROW = 12
TALLEST = 4 * 20 + 16


def bubble_limit(stage, f):
    size, right = POSE[stage]
    actor = f['x'] + f['width'] - right - size - (CAR if stage == 'live' else 0)
    return actor - TAIL - GAP


# Row 12 pt under the bubble's top runs its full width: above the tail, under the corner curve, clear of the text.
def assert_bubble_clear(shot, f, stage, appearance, wraps=False):
    fill = token('--color-stage-bubble', appearance)
    limit, y = bubble_limit(stage, f), f['y'] + TOP + ROW
    inside, beyond = shot.rgb(limit - 5, y), shot.rgb(limit + 4, y)
    print(f'{stage} bubble: limit x={limit:.0f} ({limit - f["x"] - LEFT:.0f} wide), inside {inside}, beyond {beyond}')
    assert not close(beyond, fill, 12), f'the bubble passes x={limit:.0f} towards 小貘 on the {stage} stage: {beyond}'
    if wraps:
        assert close(inside, fill, 12), f'the wrapped bubble does not reach its {stage} width: {inside} at x={limit - 5:.0f}'


def assert_bubble_whole(ui, shot, f, stage, line):
    words = re.sub(r'\W+$', '', line)
    last = words[-2:] if ui.locale == 'zh-Hans' else words.split()[-1]
    region = {'x': f['x'], 'y': f['y'] + TOP - (TALLEST - 76) - 6, 'width': bubble_limit(stage, f) - f['x'] + TAIL,
              'height': TALLEST + 12}
    read = ocr.lines_in(shot, ui.locale)
    found = ocr.find(read, re.escape(last), region)
    shown = [r['text'] for r in read if ocr.inside(r, region)]
    assert found, f'the bubble does not end with 「{last}」 (cut short?): {shown}'
    assert not any('…' in text or text.rstrip().endswith('...') for text in shown), f'the bubble is truncated: {shown}'
