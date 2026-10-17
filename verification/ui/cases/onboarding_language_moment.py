"""The language step sits on the moment background with 小貘's head and the moment title above the native picker and a 44 pt get-started button."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_colour, assert_touch_target, token  # noqa: E402

DEPS = ['src/features/account/', 'src/app/onboarding/', 'src/debug/', 'src/app/debug/']

SCENE = 'language-step'
LOCALES = ['zh-Hans', 'ms']
QUESTION = {'zh-Hans': '你想用哪种语言？', 'ms': 'Bahasa mana pilihan anda?'}

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
title = ui.labelled(QUESTION[ui.locale])
english = ui.labelled('English')
done = ui.element('language-done')
assert_touch_target(done, 'get started button')
screen = ui.read()[0]['frame']
assert title['frame']['x'] >= 16, f'title touches the edge: {title["frame"]}'
assert title['frame']['y'] < english['frame']['y'] < done['frame']['y'], 'title, picker and button are out of order'
assert done['frame']['y'] + done['frame']['height'] <= screen['height'], f'get started is off screen: {done["frame"]}'
shot = ui.snap('language-step')
below = english['frame']['y'] + 200
assert_colour(shot, {'x': 2, 'y': below, 'width': 12, 'height': 12},
              token('--color-moment-bg', ui.appearance), 'moment background')
print('PASS: the language step uses the moment background with the title above the native picker')
