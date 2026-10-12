"""Settings with a 40-character name and long email keeps every row reachable and the delete row visible."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, assert_touch_target  # noqa: E402

SCENE = 'settings'
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
ui.wait_label('settings-profile', lambda label: label.startswith('欧阳娜娜' * 10), 'settings does not show the long name')
for identifier in ('settings-sign-out', 'settings-delete'):
    assert_touch_target(ui.element(identifier), identifier)
shot = ui.capture('settings')
assert_appearance(shot, ui.appearance, 20, 2500, 'screen background')
print('PASS: long name settings')
