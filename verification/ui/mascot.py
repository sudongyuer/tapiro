import json
import tempfile

from choose import defaults
from driver import Shot, by_id, token
from profile import rep_calls
from recording import frames

POSES = {'calm': (96, 58, -8), 'urgent': (96, 58, -8), 'live': (86, 54, 2)}
FRAME_GAP_S = 0.03
MOVED = 40
MOVED_SHARE = 0.01
BOX_PAD = 14
GROWN = 'mascot-grown'


def stage(ui, state='calm'):
    return ui.element(f'home-stage-{state}', timeout=45)


def mascot_box(element, width, state='calm'):
    size, right, top = POSES[state]
    f = element['frame']
    return {'x': width - right - size - BOX_PAD, 'y': f['y'] + top - BOX_PAD,
            'width': size + 2 * BOX_PAD, 'height': size + 2 * BOX_PAD}


def star_box(element, width, state='calm'):
    size, right, top = POSES[state]
    f = element['frame']
    return {'x': width - right - size + 12, 'y': f['y'] + top - 22, 'width': 42, 'height': 42}


def tap_mascot(ui, element, state='calm'):
    size, right, top = POSES[state]
    width = ui.read()[0]['frame']['width']
    ui.tap_point(width - right - size / 2, element['frame']['y'] + top + size / 2)


def says(ui, text, state='calm', timeout=45):
    ui.wait(lambda items: (by_id(items, f'home-stage-{state}') or {}).get('AXLabel') == text or None,
            f'the stage never said {text!r}', timeout)


def last_run(steps, gap=0.35):
    run = steps[-1:]
    for at in reversed(steps[:-1]):
        if run[0] - at > gap:
            break
        run.insert(0, at)
    return run


def moved_at(video, box, width):
    with tempfile.TemporaryDirectory() as tmp:
        shots = [(Shot(path, width), at) for path, at in frames(video, tmp, FRAME_GAP_S)]
        steps = []
        for (before, _), (after, at) in zip(shots, shots[1:]):
            a, b = list(before.pixels(box)), list(after.pixels(box))
            hits = sum(1 for p, q in zip(a, b) if max(abs(x - y) for x, y in zip(p, q)) > MOVED)
            if hits / max(1, len(a)) > MOVED_SHARE:
                steps.append(at)
    return steps


def assert_moment(ui, title_level, count, from_level, to_level, unlocked):
    ui.element(GROWN, timeout=20)
    name = ui.t(f'reputation.level.lv{title_level}') if title_level <= 5 else ui.t('reputation.level.grown')
    ui.labelled(ui.t('reputation.grown.title', name=name))
    progress = ui.settled(lambda items: by_id(items, 'mascot-grown-progress'), 'the sticker line never settled')
    assert progress.get('AXLabel') == ui.t('reputation.grown.progress', count=count, **{'from': from_level, 'to': to_level})
    items = ui.read()
    assert (by_id(items, 'mascot-grown-unlocked') is not None) == bool(unlocked), f'unlocked card vs {unlocked}'
    for level, accessory in unlocked:
        line = ui.t('reputation.grown.unlockedRow', level=level, name=ui.t(f'reputation.accessory.{accessory}'))
        assert [i for i in items if i.get('AXLabel') == line], f'{line} is not listed'


def colour_count(shot, box, colour, tolerance=24):
    return sum(1 for p in shot.pixels(box) if max(abs(a - b) for a, b in zip(p, colour)) < tolerance)


def ink_top(shot, box, ui):
    ink = token('--color-mascot-ink', ui.appearance)
    rows = {}
    for x, y, p in ((box['x'] + i, box['y'] + j, shot.rgb(box['x'] + i, box['y'] + j))
                    for i in range(0, int(box['width']), 3) for j in range(0, int(box['height']), 2)):
        if max(abs(a - b) for a, b in zip(p, ink)) < 24:
            rows[y] = rows.get(y, 0) + 1
    return min((y for y, n in rows.items() if n >= 3), default=None)


def assert_grown(ui, shot, element, width, wear, state='calm'):
    assert_wearing(ui, shot, element, width, wear, state)
    f = element['frame']
    bubble = {'x': 16, 'y': f['y'] + 18, 'width': 90, 'height': 36}
    white = colour_count(shot, bubble, token('--color-stage-bubble', ui.appearance))
    assert white > 200, f'the bubble is not visible: {white} px'


def rep_times(ui, name):
    text = defaults(ui, 'uiVerifyRepCalls')
    return [call['at'] for call in json.loads(text or '[]') if call['name'] == name]


def assert_wearing(ui, shot, element, width, wear, state='calm'):
    worn = colour_count(shot, mascot_box(element, width, state), token(wear, ui.appearance))
    assert worn > 40, f'小貘 wears nothing at rest: {worn} px of {wear}'


def seen_levels(ui, count=1, timeout=10):
    return [call['level'] for call in rep_calls(ui, 'markLevelSeen', count, timeout=timeout)]
