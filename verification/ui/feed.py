import tempfile

from coins import coin_calls
from driver import Shot, token
from mascot import colour_count, ink_top, mascot_box, says
from recording import frames

KEY = 'coins.feed'


def line(ui, name):
    return ui.t(f'{KEY}.{name}')


def leaf_pixels(ui, shot, element, width, state='calm'):
    box = mascot_box(element, width, state)
    wide = {**box, 'x': box['x'] - 10, 'width': box['width'] + 40, 'height': box['height'] + 40}
    return colour_count(shot, wide, token('--color-leaf', ui.appearance), tolerance=20)


def body_tops(ui, video, box, width):
    with tempfile.TemporaryDirectory() as tmp:
        tops = [ink_top(Shot(path, width), box, ui) for path, _ in frames(video, tmp, 0.03)]
    return [top for top in tops if top is not None]


def bubble_pixels(ui, shot, element, size=36):
    f = element['frame']
    box = {'x': 16, 'y': f['y'] + 18, 'width': size, 'height': 36}
    return colour_count(shot, box, token('--color-stage-bubble', ui.appearance), tolerance=8)


def leaf_peak(ui, video, element, width):
    with tempfile.TemporaryDirectory() as tmp:
        return max(leaf_pixels(ui, Shot(path, width), element, width) for path, _ in frames(video, tmp, 0.03))


def leaf_above(ui, video, element, width):
    box = mascot_box(element, width)
    band = {**box, 'x': box['x'] - 10, 'y': box['y'] - 60, 'height': 90}
    leaf = token('--color-leaf', ui.appearance)
    with tempfile.TemporaryDirectory() as tmp:
        return max(colour_count(Shot(path, width), band, leaf, tolerance=20) for path, _ in frames(video, tmp, 0.03))


def feeds(ui, count, timeout=10):
    return coin_calls(ui, 'feed', count, timeout=timeout)


def assert_one_feed(ui, message):
    assert len(feeds(ui, 1)) == 1, message
    assert len(feeds(ui, 2, timeout=3)) == 1, f'{message}: sent twice'


def back_to(ui, text, state='calm'):
    says(ui, text, state, timeout=15)
