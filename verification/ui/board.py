import re

from driver import by_id, close, token

CARD = 'bounty-card-'
TOP_CLEAR, BOTTOM_CLEAR = 120, 110
MIN_DRAG = 120


def screen(items):
    return items[0]['frame']


def scroll_down(ui, items, share=0.32):
    s = screen(items)
    ui.swipe((s['width'] / 2, s['height'] * 0.72), (s['width'] / 2, s['height'] * (0.72 - share)), 0.5)


def top_clear(items):
    strip = by_id(items, 'home-strip')
    if not strip:
        return TOP_CLEAR
    return max(TOP_CLEAR, strip['frame']['y'] + strip['frame']['height'])


def in_view(element, s, top=TOP_CLEAR):
    f = element['frame']
    return f['y'] >= top and f['y'] + f['height'] <= s['height'] - BOTTOM_CLEAR


def visible(ui, identifier, tries=10):
    for _ in range(tries):
        items = ui.read()
        found, s = by_id(items, identifier), screen(items)
        top = top_clear(items)
        if found and in_view(found, s, top):
            return ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled')
        if not found:
            scroll_down(ui, items)
            continue
        f = found['frame']
        below = f['y'] + f['height'] - (s['height'] - BOTTOM_CLEAR) + 24
        delta = below if below > 0 else f['y'] - top - 24
        delta = max(-s['height'] * 0.5, min(s['height'] * 0.5, delta))
        delta = max(delta, MIN_DRAG) if delta > 0 else min(delta, -MIN_DRAG)
        start = s['height'] * (0.75 if delta > 0 else 0.25)
        ui.swipe((s['width'] / 2, start), (s['width'] / 2, start - delta), 1.2)
    raise AssertionError(f'{identifier} never scrolled into view')


def cards(items):
    return [i for i in items if (i.get('AXUniqueId') or '').startswith(CARD)
            and re.fullmatch(r'bounty-card-[\w-]+?-\d+', i.get('AXUniqueId') or '')]


def ink_box(shot, f, colour, tolerance=4):
    xs, ys = [], []
    x0, y0 = round(f['x'] * shot.scale), round(f['y'] * shot.scale)
    x1, y1 = round((f['x'] + f['width']) * shot.scale), round((f['y'] + f['height']) * shot.scale)
    for py in range(max(0, y0), min(shot.height, y1)):
        for px in range(max(0, x0), min(shot.width, x1)):
            if close(shot._px(px, py), colour, tolerance):
                xs.append(px)
                ys.append(py)
    if not xs:
        return None
    return {'x': min(xs) / shot.scale, 'y': min(ys) / shot.scale,
            'width': (max(xs) - min(xs) + 1) / shot.scale, 'height': (max(ys) - min(ys) + 1) / shot.scale,
            'count': len(xs)}


def apply_pill(shot, card, appearance):
    f = card['frame']
    lower_right = {'x': f['x'] + f['width'] / 2, 'y': f['y'] + f['height'] / 2,
                   'width': f['width'] / 2, 'height': f['height'] / 2}
    return ink_box(shot, lower_right, token('--color-accent', appearance))


def distance_text(ui, metres):
    if metres < 1000:
        text = ui.t('bounty.board.distance.meters', value=str(round(metres)))
    else:
        km = round(metres / 100) / 10
        value = f'{km:.1f}'.rstrip('0').rstrip('.') if km < 10 else str(round(km))
        text = ui.t('bounty.board.distance.kilometers', value=value)
    return text.replace(' ', ' ')
