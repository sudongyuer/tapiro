import re
import time

from driver import Shot, assert_appearance, bottom, by_id, luma
from gestures import drag
from ocr import find, inside, lines_in
from profile import label, rep_calls

SHEET = 'review-sheet'

def open_sheet(ui):
    return ui.element(SHEET, timeout=45)


def assert_one_submit(ui):
    # The call log reaches the plist late: wait for the first row, then give a replay the time to show.
    assert rep_calls(ui, 'submitReview', 1, timeout=15), 'nothing was submitted'
    time.sleep(2)
    calls = rep_calls(ui, 'submitReview', 2, timeout=2)
    assert len(calls) == 1, f'the review was sent again on its own: {calls}'
    return calls[0]


def enabled(ui, identifier):
    element = ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled')
    return element.get('enabled') is not False


def sealed(ui, name, days):
    ui.element('review-sealed-ok', timeout=20)
    title = label(ui, 'review-sealed-title')
    assert title == ui.t('reputation.sheet.sealedTitle', name=name), title
    note = label(ui, 'review-sealed-note')
    assert note == ui.tn('reputation.sheet.sealedNote', days, name=name), note


def shot(ui, name):
    # Outside every pill and the envelope, on the sheet's own background.
    path = ui.capture(name)
    assert_appearance(path, ui.appearance, 20, 2000, 'the review sheet')
    return path


def on_screen_row(ui, identifier, tries=6):
    # Rows sit below the ticket and the stage; drag until the row is fully above the tab bar.
    for _ in range(tries):
        items = ui.read()
        row = by_id(items, identifier)
        height = items[0]['frame']['height']
        if row and row['frame']['y'] + row['frame']['height'] < height - 110 and row['frame']['y'] > 90:
            return row
        drag(ui, (items[0]['frame']['width'] / 2, height * 0.72), (items[0]['frame']['width'] / 2, height * 0.42))
    raise AssertionError(f'{identifier} never came on screen')


def submit_happy(ui):
    ui.element('review-face-happy', timeout=30)
    ui.tap('review-face-happy')
    ui.element('review-submit')
    ui.tap('review-submit')
    ui.element('review-sealed-ok', timeout=20)


def header_bottom(ui, items, name):
    title = ui.t('reputation.sheet.title', name=name)
    heading = next((i for i in items if i.get('type') == 'Heading' and i.get('AXLabel') == title), None)
    assert heading, f'the sheet header {title} is missing'
    return bottom(heading)


def keyboard_top(ui):
    # The keyboard stays in the tree below the screen's edge after it hides, so its keys count only on screen.
    def shown(items):
        board = by_id(items, 'UIKeyboardLayoutStar Preview')
        return board if board and bottom(board) <= items[0]['frame']['height'] + 1 else None
    return ui.settled(shown, 'the software keyboard never showed', 15)['frame']['y']


def read_shot(ui, name):
    path = shot(ui, name)
    picture = Shot(path, ui.read()[0]['frame']['width'])
    return picture, lines_in(picture, ui.locale)


def loose(text):
    return re.sub(r'[\s\u00a0\u2060]+', '', text)


def text_inside(read, f):
    rows = sorted((line for line in read if inside(line, f, slack=4)), key=lambda line: (line['y'], line['x']))
    return loose(''.join(line['text'] for line in rows))


def one_line(read, phrase, f):
    return find(read, r'\s*'.join(re.escape(letter) for letter in loose(phrase)), f)


def ink_luma(picture, box, appearance):
    values = [luma(rgb) for rgb in picture.pixels(box)]
    assert values, f'{box} is off screen'
    return max(values) if appearance == 'dark' else min(values)


def assert_grey(picture, box, appearance, name):
    value = ink_luma(picture, box, appearance)
    assert (value < 200) if appearance == 'dark' else (value > 90), f'{name} is drawn in ink, not grey: luma {value:.0f}'


def assert_ink(picture, box, appearance, name):
    value = ink_luma(picture, box, appearance)
    assert (value >= 200) if appearance == 'dark' else (value <= 90), f'{name} is not drawn in the accent: luma {value:.0f}'
