from bounty import relaunch
from driver import Shot, by_id, close

SCENE = 'bounty-map'
MAP = 'bounty-map-view'
PIN = 'map-pin-'
FRONT, BACK = 'map-card-front', 'map-card-back'
CARD_FILL = {'light': (255, 255, 255), 'dark': (28, 28, 30)}
CARD_PADDING = 16
DISC = 44
WHITE = 250
LOCATION_SIDE = (36, 48)
HALO = 24


def open_scene(ui, *args, ready=None, drop=()):
    relaunch(ui, drop=list(drop), add=['-uiVerifyScene', SCENE, *args], ready=ready or 'bounty-map-scene')


def pins(items):
    unique = {}
    for i in items:
        if (i.get('AXUniqueId') or '').startswith(PIN):
            unique.setdefault(i['AXUniqueId'], i)
    return list(unique.values())


def pin_id(row_id):
    return f'{PIN}{row_id}'


def map_frame(ui):
    return ui.settled(lambda items: by_id(items, MAP), 'the map view never settled')['frame']


def centre(f):
    return f['x'] + f['width'] / 2, f['y'] + f['height'] / 2


def inside(f, outer, slack=1):
    return (f['x'] >= outer['x'] - slack and f['y'] >= outer['y'] - slack
            and f['x'] + f['width'] <= outer['x'] + outer['width'] + slack
            and f['y'] + f['height'] <= outer['y'] + outer['height'] + slack)


def contains(f, x, y, pad=0):
    return f['x'] - pad <= x <= f['x'] + f['width'] + pad and f['y'] - pad <= y <= f['y'] + f['height'] + pad


def location_dots(items):
    m = by_id(items, MAP)
    if not m:
        return []
    return [i['frame'] for i in items if i.get('type') == 'GenericElement' and not i.get('AXUniqueId')
            and LOCATION_SIDE[0] <= i['frame']['width'] <= LOCATION_SIDE[1]
            and LOCATION_SIDE[0] <= i['frame']['height'] <= LOCATION_SIDE[1] and contains(m['frame'], *centre(i['frame']))]


def masked(shot, frames):
    data = bytearray(shot.data)
    for f in frames:
        x0, x1 = max(0, round(f['x'] * shot.scale)), min(shot.width, round((f['x'] + f['width']) * shot.scale))
        y0, y1 = max(0, round(f['y'] * shot.scale)), min(shot.height, round((f['y'] + f['height']) * shot.scale))
        for y in range(y0, y1):
            row = y if shot.top_down else shot.height - 1 - y
            start = shot.offset + row * shot.stride + x0 * shot.pixel_bytes
            data[start:start + max(0, x1 - x0) * shot.pixel_bytes] = bytes(max(0, x1 - x0) * shot.pixel_bytes)
    return bytes(data)


def map_at_rest(ui, message='the screen never came to rest'):
    items = ui.read()
    halos = [{'x': f['x'] - HALO, 'y': f['y'] - HALO, 'width': f['width'] + 2 * HALO, 'height': f['height'] + 2 * HALO}
             for f in location_dots(items)]
    points = items[0]['frame']['width']
    ui.at_rest(message, convert=lambda path: masked(Shot(path, points), halos))


def pin_title(ui, label):
    template = ui.t('bounty.board.map.pin', title='TITLE', reward='REWARD')
    sep = template[len('TITLE'):template.index('REWARD')]
    applied = ui.t('bounty.board.card.separator') + ui.t('bounty.board.card.applied')
    if label.endswith(applied):
        label = label[:-len(applied)]
    return label.rsplit(sep, 1)[0]


def disc_centre(f):
    return f['x'] + f['width'] / 2, f['y'] + f['height'] - DISC / 2


# MapKit lists each annotation view twice in the AX tree, so AXe refuses `tap --id`; tap the disc by point.
def tap_pin(ui, row_id):
    pin = ui.settled(lambda items: by_id(items, pin_id(row_id)), f'{row_id} never settled')
    ui.tap_point(*disc_centre(pin['frame']))
    return ui.settled(lambda items: by_id(items, FRONT), f'no card opened for {row_id}')


def empty_spot(ui, avoid=()):
    m = map_frame(ui)
    items = ui.read()
    blocked = [p['frame'] for p in pins(items)] + [a['frame'] for a in avoid]
    for fx in (0.15, 0.85, 0.5, 0.25, 0.75):
        for fy in (0.12, 0.88, 0.3, 0.7, 0.5):
            x, y = m['x'] + m['width'] * fx, m['y'] + m['height'] * fy
            if not any(contains(f, x, y, pad=24) for f in blocked):
                return x, y
    raise AssertionError('no empty spot on the map to tap')


def close_card(ui):
    face = by_id(ui.read(), FRONT) or by_id(ui.read(), BACK)
    x, y = empty_spot(ui, avoid=[face] if face else [])
    ui.tap_point(x, y)
    ui.gone(FRONT)
    ui.gone(BACK)


def face_box(ui, summary_id, foot_ids):
    items = ui.read()
    summary = by_id(items, summary_id)
    assert summary, f'{summary_id} is missing'
    parts = [summary['frame']] + [by_id(items, i)['frame'] for i in foot_ids if by_id(items, i)]
    x0 = min(p['x'] for p in parts) - CARD_PADDING
    y0 = min(p['y'] for p in parts) - CARD_PADDING
    x1 = max(p['x'] + p['width'] for p in parts) + CARD_PADDING
    y1 = max(p['y'] + p['height'] for p in parts) + CARD_PADDING
    return {'x': x0, 'y': y0, 'width': x1 - x0, 'height': y1 - y0}


def assert_card_surface(ui, shot, face, name):
    fill = CARD_FILL[ui.appearance]
    band = {'x': face['x'] + 8, 'y': face['y'] + 3, 'width': face['width'] - 16, 'height': 6}
    found = [rgb for rgb in shot.pixels(band)]
    share = sum(1 for rgb in found if close(rgb, fill, 4)) / max(1, len(found))
    assert share > 0.9, f'{name}: the card top band is not the card fill {fill} ({share:.0%})'


def assert_tail(ui, shot, face, pin_x, side, name):
    fill = CARD_FILL[ui.appearance]
    y = face['y'] + face['height'] + 4 if side == 'above' else face['y'] - 4
    tip = shot.count({'x': pin_x - 3, 'y': y - 1, 'width': 6, 'height': 2}, lambda rgb: close(rgb, fill, 4))
    off = shot.count({'x': face['x'] + 6, 'y': y - 1, 'width': 6, 'height': 2}, lambda rgb: close(rgb, fill, 4))
    print(f'{name}: tail pixels at the pin {tip}, at the card corner {off}')
    assert tip > off and tip >= 6, f'{name}: no tail drawn at the pin x {pin_x:.0f} ({tip} vs {off})'


def label_white(shot, pin):
    f = pin['frame']
    band = {'x': f['x'] + 4, 'y': f['y'] + 2, 'width': f['width'] - 8, 'height': max(4, f['height'] - DISC - 6)}
    beside = {**band, 'x': band['x'] - band['width'] - 24}
    white = lambda rgb: min(rgb) >= WHITE  # noqa: E731
    return shot.count(band, white), shot.count(beside, white)
