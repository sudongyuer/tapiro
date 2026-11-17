"""The language step sits on the moment background with 小貘's head and the moment title above the native picker and a 44 pt get-started button.
Title, rows and button share one 24 pt column, the picker has no 「语言」 header under the question, and the rows use the filled-row colour."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_colour, assert_touch_target, token  # noqa: E402

COLUMN = 24

DEPS = ['src/features/account/', 'src/app/onboarding/']

SCENE = 'language-step'
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
title = ui.labelled(ui.t('account.language.question'))
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
assert done['frame']['y'] + done['frame']['height'] <= screen['height'], f'get started is off screen: {done["frame"]}'
shot = ui.snap('language-step')
row = english['frame']
assert_colour(shot, {'x': row['x'] + row['width'] - 40, 'y': row['y'] + 12, 'width': 12, 'height': 12},
              token('--color-filled-row', ui.appearance), 'language row')
below = english['frame']['y'] + 200
assert_colour(shot, {'x': 2, 'y': below, 'width': 12, 'height': 12},
              token('--color-moment-bg', ui.appearance), 'moment background')
print('PASS: the language step uses the moment background with the title above the native picker')
