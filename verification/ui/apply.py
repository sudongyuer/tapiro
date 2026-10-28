from board import apply_pill, ink_box, visible
from driver import by_id, token

STAMP_REACH = 16
STAMP_WIDTH = 110
STAMP_MIN = 40


def title_shown(ui, key):
    title = ui.t(key)
    return ui.wait(lambda items: next((i for i in items if i.get('type') == 'Heading' and i.get('AXLabel') == title),
                                      None), f'no screen titled {title}')


def send_button(ui, items):
    label = ui.t('bounty.apply.send')
    return next((i for i in items if i.get('type') == 'Button' and i.get('AXLabel') == label), None)


def open_from_card(ui, card_id, ready='bounty-apply-note'):
    card = visible(ui, card_id)
    ui.at_rest()
    pill = apply_pill(ui.snap(f'card-{card_id[-2:]}-before'), card, ui.appearance)
    assert pill, f'{card_id} shows no 申请 pill'
    ui.tap_point(pill['x'] + pill['width'] / 2, pill['y'] + pill['height'] / 2)
    ui.element(ready)
    title_shown(ui, 'bounty.apply.title')


def note_value(items):
    return (by_id(items, 'bounty-apply-note') or {}).get('AXValue') or ''


def type_note(ui, text):
    field = ui.settled(lambda items: by_id(items, 'bounty-apply-note'), 'the note field never settled')['frame']
    ui.tap_point(field['x'] + field['width'] / 2, field['y'] + field['height'] / 2)
    ui.type(text)
    ui.wait(lambda items: note_value(items).lower() == text.lower(), f'the note does not read {text!r}')
    return note_value(ui.read())


def count_reads(ui, count):
    expected = ui.t('bounty.apply.countLabel', count=count, max=140)
    ui.wait(lambda items: (by_id(items, 'bounty-apply-count') or {}).get('AXLabel') == expected,
            f'the counter does not read {expected!r}')


def send(ui):
    button = ui.settled(lambda items: send_button(ui, items), '发送 never settled')
    assert button.get('enabled'), '发送 is disabled'
    f = button['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)


def stamp_box(ui, shot, f):
    lane = {'x': f['x'] - STAMP_REACH, 'y': f['y'], 'width': STAMP_REACH + STAMP_WIDTH, 'height': f['height']}
    return ink_box(shot, lane, token('--color-success', ui.appearance), 40)


def has_stamp(ui, shot, f):
    found = stamp_box(ui, shot, f)
    return bool(found and found['count'] >= STAMP_MIN)
