import re

from driver import assert_colour, assert_touch_target, by_id, close, dominant, token

SLOT_HEIGHT = 84
SLOT_GAP = 10
HEADER_GAP = 12
PAPER_PADDING = 16
BUTTONS_PADDING = 16
SAFE_TOP = {874: 62, 667: 20}
PANEL_INSET = 2 * 20 + 26 + 16
GROUP_GAP_MAX = 130
PAPER = (255, 253, 248)
CARD = (239, 233, 221)


def book_label(ui, count):
    return f"{ui.t('stickers.book.title')} {ui.tn('stickers.count', count)}"


def group_scale(items, book):
    screen = by_id(items, 'pay-celebration')['frame']
    return book['frame']['width'] / (screen['width'] - PANEL_INSET)


def slot_frame(book, index, scale):
    f = book['frame']
    gap, height = SLOT_GAP * scale, SLOT_HEIGHT * scale
    width = (f['width'] - 2 * gap) / 3
    return {
        'x': f['x'] + index % 3 * (width + gap),
        'y': f['y'] + f['height'] + HEADER_GAP * scale + index // 3 * (height + gap),
        'width': width,
        'height': height,
    }


def slot_fill(shot, book, index, scale):
    f = slot_frame(book, index, scale)
    return dominant(shot, {'x': f['x'] + 5, 'y': f['y'] + f['height'] / 2 - 3, 'width': 4, 'height': 6})


def assert_slots(shot, book, count, scale):
    landed = slot_fill(shot, book, 0, scale)
    assert landed[1] - landed[0] >= 3, f'slot 0 is not the landed green tint: {landed}'
    cards = min(count - 1, 5)
    for index in range(1, 6):
        found = slot_fill(shot, book, index, scale)
        expected, kind = (CARD, 'an earlier sticker') if index <= cards else (PAPER, 'an empty outline')
        assert close(found, expected, 8), f'slot {index} should be {kind}, found {found}'


def assert_centred(items, book, scale):
    screen = by_id(items, 'pay-celebration')['frame']
    done = by_id(items, 'pay-celebration-done')
    assert_touch_target(done, '好的')
    assert done['frame']['y'] + done['frame']['height'] <= screen['y'] + screen['height'], f'好的 is off screen: {done}'
    summary = by_id(items, 'pay-celebration-summary')['frame']
    body = by_id(items, 'pay-celebration-body')['frame']
    opener = by_id(items, 'pay-celebration-book-open')['frame']
    b = book['frame']
    gap = b['y'] - (body['y'] + body['height'])
    assert 0 < gap < GROUP_GAP_MAX, (
        f'the book header is {gap:.0f} pt below the subtitle; one group allows at most {GROUP_GAP_MAX} pt '
        "(小貘's overhang + 8 = 85 pt, plus the paper's 16 pt top padding, plus text-metric slack; "
        'the old split layout left about 250 pt)')
    panel_bottom = b['y'] + b['height'] + (HEADER_GAP + 2 * SLOT_HEIGHT + SLOT_GAP + PAPER_PADDING) * scale
    safe_top = SAFE_TOP.get(round(screen['height']))
    assert safe_top is not None, f"no safe-area inset known for screen height {screen['height']}; add it to SAFE_TOP"
    above = summary['y'] - safe_top
    below = opener['y'] - BUTTONS_PADDING - panel_bottom
    assert above >= -1 and below >= -1, f'the group does not fit: {above:.0f} pt above, {below:.0f} pt below'
    assert abs(above - below) <= 12, f'the group is not centred: {above:.0f} pt above, {below:.0f} pt below'


def assert_celebration(ui, *, first, count, title, name, amount, shot_name, cny=None):
    """Waits for the celebration to settle, then checks its copy, count, badge and paper; returns the screenshot."""
    ui.element('pay-celebration')
    ui.at_rest('the celebration never settled')
    items = ui.read()
    heading = by_id(items, 'pay-celebration-title')
    kind = 'first' if first else 'routine'
    assert heading and heading.get('AXLabel') == ui.t(f'pay.celebrate.{kind}.title'), heading
    body = by_id(items, 'pay-celebration-body')
    expected = ui.t('pay.celebrate.first.body') if first else ui.t('pay.celebrate.routine.body', count=count)
    assert body and body.get('AXLabel') == expected, body
    summary = by_id(items, 'pay-celebration-summary')
    announce = ui.pattern('pay.celebrate.announce', amount=amount, title=re.escape(title), name=re.escape(name))
    if cny:
        announce += ' ' + ui.pattern('pay.celebrate.cny', amount=cny)
    assert summary and re.fullmatch(announce, summary.get('AXLabel') or ''), summary
    book = by_id(items, 'pay-celebration-book')
    assert book and book.get('AXLabel') == book_label(ui, count), book
    badge = by_id(items, 'pay-celebration-badge')
    if first:
        assert badge and badge.get('AXLabel') == ui.t('pay.celebrate.badge'), badge
    else:
        assert badge is None, 'a later settle shows the first-payment badge'
    assert by_id(items, 'pay-celebration-book-open') and by_id(items, 'pay-celebration-done'), 'buttons missing'
    scale = group_scale(items, book)
    assert_centred(items, book, scale)
    shot = ui.snap(shot_name)
    assert_slots(shot, book, count, scale)
    f = book['frame']
    assert_colour(shot, {**f, 'width': f['width'] * 0.6}, token('--color-paper', ui.appearance), 'book paper', 10)
    screen = by_id(items, 'pay-celebration')['frame']
    corner = {'x': screen['x'] + 4, 'y': screen['y'] + screen['height'] * 0.55, 'width': 10, 'height': 10}
    assert_colour(shot, corner, token('--color-moment-bg', ui.appearance), 'moment background', 12)
    return shot
