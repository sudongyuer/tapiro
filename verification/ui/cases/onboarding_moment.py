"""The name step sits on the moment background with 小貘's head and the moment title, and keeps a 40-character name in a full-size field."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_colour, assert_touch_target, token  # noqa: E402

DEPS = ['src/features/account/', 'src/app/onboarding/']

SCENE = 'profile-setup'
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
title = ui.labelled(ui.t('account.name.question'))
field = ui.element('name-input')
assert len(field.get('AXValue') or '') == 40, f'expected the 40-character fixture name, got {field.get("AXValue")}'
assert_touch_target(field, 'name field')
button = ui.element('name-continue')
assert_touch_target(button, 'continue button')
screen = ui.read()[0]['frame']
assert button['frame']['y'] + button['frame']['height'] <= screen['height'], f'continue button is off screen: {button["frame"]}'
assert title['frame']['y'] < field['frame']['y'] < button['frame']['y'], 'title, field and button are out of order'
shot = ui.snap('name-step')
assert_colour(shot, {'x': 2, 'y': field['frame']['y'] + field['frame']['height'] + 60, 'width': 12, 'height': 12},
              token('--color-moment-bg', ui.appearance), 'moment background')
print('PASS: the name step uses the moment background and fits a 40-character name')
