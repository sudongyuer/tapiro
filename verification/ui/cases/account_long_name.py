"""The name step shows a 40-character prefilled name with the field and continue button at full size."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, assert_touch_target  # noqa: E402

SCENE = 'profile-setup'
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
field = ui.element('name-input')
assert len(field.get('AXValue') or '') == 40, f'expected the 40-character fixture name, got {field.get("AXValue")}'
assert_touch_target(field, 'name field')
assert_touch_target(ui.element('name-continue'), 'continue button')
shot = ui.capture('name-step')
assert_appearance(shot, ui.appearance, 20, 2500, 'screen background')
print('PASS: 40-character name fits the name step')
