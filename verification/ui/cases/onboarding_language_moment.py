"""The language step sits on the moment background with 小貘's head and the moment title above the native picker and a 44 pt get-started button.
Title, rows and button share one 24 pt column, the picker has no 「语言」 header under the question, and the rows use the filled-row colour.
The whole question is drawn: in en its second line 「prefer?」 lost its first glyph to the hosted view's edge (audit O2).
小貘's greeting starts below the navigation bar, where the name step's starts: the O2 fix first put it under the back button."""
import os
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_colour, assert_touch_target, by_id, token  # noqa: E402
from whole import assert_drawn_whole  # noqa: E402

COLUMN = 24
LARGE_TEXT = os.environ.get('TAPIRO_TEXT_SIZE', 'large') != 'large'

DEPS = ['src/features/account/', 'src/app/onboarding/', 'verification/ui/whole.py']

SCENE = 'language-step'
LOCALES = ['zh-Hans', 'en', 'ms']

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
title = ui.labelled(ui.t('account.language.question'))


def last_row_above(items, done):
    row = next((i for i in items if i.get('AXLabel') == ui.t('languages.ms')), None)
    return row if row and row['frame']['y'] + row['frame']['height'] <= done['frame']['y'] else None


if LARGE_TEXT:
    done = ui.element('language-done')
    ui.snap('language-step')
    screen = ui.read()[0]['frame']
    middle = screen['width'] / 2
    for _ in range(3):
        if last_row_above(ui.read(), done):
            break
        ui.swipe((middle, done['frame']['y'] - 40), (middle, screen['height'] * 0.2))
    items = ui.read()
    row = last_row_above(items, done)
    assert row, 'at AX5 the last language row never scrolls above the get-started button'
    question = by_id(items, 'language-question')
    assert question is None or question['frame']['y'] < title['frame']['y'], 'the question did not scroll with the rows'
    ui.snap('language-step-scrolled')
    print('PASS: at AX5 the heading scrolls with the rows and every language reaches the screen above get started')
    sys.exit(0)

english = ui.labelled(ui.t('languages.en'))
done = ui.element('language-done')
assert_touch_target(done, 'get started button')
screen = ui.read()[0]['frame']
for name, f in (('title', title['frame']), ('row', english['frame']), ('button', done['frame'])):
    assert abs(f['x'] - COLUMN) <= 1, f'the {name} starts at x {f["x"]}, not on the {COLUMN} pt column'
assert abs(english['frame']['width'] - (screen['width'] - 2 * COLUMN)) <= 1, f'rows are {english["frame"]["width"]} pt wide'
header = ui.t('account.settings.language')
assert not [i for i in ui.read() if i.get('AXLabel') == header], f'the picker repeats the {header!r} header under the question'
assert title['frame']['y'] < english['frame']['y'] < done['frame']['y'], 'title, picker and button are out of order'
greeting = ui.labelled(ui.t('account.language.greeting'))['frame']
bars = [i['frame'] for i in ui.read() if i.get('AXUniqueId') == 'RNSScreen' and 0 < i['frame']['y'] and i['frame']['height'] < 100]
assert bars, 'no navigation bar over the language step'
bar_bottom = bars[0]['y'] + bars[0]['height']
assert greeting['y'] >= bar_bottom + 8, f'the greeting at y {greeting["y"]} sits under the navigation bar ending at {bar_bottom}'
assert done['frame']['y'] + done['frame']['height'] <= screen['height'], f'get started is off screen: {done["frame"]}'
shot = ui.snap('language-step')
assert_drawn_whole(ui, shot, title['frame'], ui.t('account.language.question'), 'the question')
row = english['frame']
assert_colour(shot, {'x': row['x'] + row['width'] - 40, 'y': row['y'] + 12, 'width': 12, 'height': 12},
              token('--color-filled-row', ui.appearance), 'language row')
below = english['frame']['y'] + 200
assert_colour(shot, {'x': 2, 'y': below, 'width': 12, 'height': 12},
              token('--color-moment-bg', ui.appearance), 'moment background')
print('PASS: the language step uses the moment background with the title above the native picker')
