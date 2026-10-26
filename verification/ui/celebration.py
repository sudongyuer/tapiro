import re

from driver import Shot, assert_colour, by_id, token


def book_label(ui, count):
    return f"{ui.t('stickers.book.title')} {ui.tn('stickers.count', count)}"


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
    shot = ui.snap(shot_name)
    f = book['frame']
    assert_colour(shot, {**f, 'width': f['width'] * 0.6}, token('--color-paper', ui.appearance), 'book paper', 10)
    screen = by_id(items, 'pay-celebration')['frame']
    corner = {'x': screen['x'] + 4, 'y': screen['y'] + screen['height'] * 0.55, 'width': 10, 'height': 10}
    assert_colour(shot, corner, token('--color-moment-bg', ui.appearance), 'moment background', 12)
    return shot
