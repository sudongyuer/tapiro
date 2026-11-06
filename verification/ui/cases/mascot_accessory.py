"""250 A: your own profile offers the accessories you unlocked. 雨伞 is worn by default (the newest), 围巾 stays locked;
a tap on 书包 sends one write and the check moves after the server answers; a tap on what you wear sends nothing."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from mascot import DEPS as MASCOT_DEPS  # noqa: E402
from profile import label, open_profile, rep_calls, scroll_to  # noqa: E402

DEPS = [*MASCOT_DEPS, 'verification/ui/profile.py']
SCENE = 'profile'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson',
        '00000000-0000-4000-8000-000000000001', '-uiVerifyProfileTab', 'me', '-uiVerifyMascot', 'rest',
        '-uiVerifyRepDelayMs', '300']
LOCALES = ['zh-Hans', 'ms']


def name(key):
    return ui.t(f'reputation.accessory.{key}')


def worn(key):
    return ui.t('reputation.profile.accessoryWornA11y', name=name(key))


def open_row(key):
    return ui.t('reputation.profile.accessoryUnlockedA11y', name=name(key))


ui = UI(*sys.argv[1:])
open_profile(ui)
scroll_to(ui, 'profile-accessory-scarf')
assert label(ui, 'profile-accessory-umbrella') == worn('umbrella')
assert label(ui, 'profile-accessory-backpack') == open_row('backpack')
assert label(ui, 'profile-accessory-scarf') == ui.t('reputation.profile.accessoryLockedA11y', name=name('scarf'), level=5)
row = by_id(ui.read(), 'profile-accessory-backpack')
assert row.get('type') == 'Button', row.get('type')
assert_touch_target(row, name('backpack'))
ui.at_rest()
ui.capture('01-picker')

ui.tap('profile-accessory-umbrella')
time.sleep(1.5)
assert not rep_calls(ui, 'setAccessory', 1, timeout=0), 'a tap on what you wear sent a write'

ui.tap('profile-accessory-backpack')
ui.wait_label('profile-accessory-backpack', lambda text: text == worn('backpack'), '书包 never became worn')
assert label(ui, 'profile-accessory-umbrella') == open_row('umbrella')
assert rep_calls(ui, 'setAccessory', 2, timeout=1) == [{'accessory': 'backpack'}], 'expected one write'
ui.at_rest()
ui.capture('02-changed')
print('PASS: the picker shows what is worn, changes after the server answers and ignores a tap on the worn one')
