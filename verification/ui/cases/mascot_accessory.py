"""250 A: your own profile offers the accessories you unlocked. 雨伞 is worn by default (the newest), 围巾 stays locked;
a tap on 书包 sends one write and the check moves after the server answers; a tap on what you wear sends nothing."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, close  # noqa: E402
from profile import assert_tier_whole, label, open_profile, rep_calls, scroll_to  # noqa: E402

DEPS = ['src/features/reputation/', 'src/features/home/HomeScreen.tsx', 'src/ui/MascotStage.tsx', 'src/ui/Mascot.tsx', 'src/ui/MascotWear.tsx', 'src/lib/i18n/locales/reputation/', 'src/app/(tabs)/bounty/', 'verification/ui/mascot.py', 'verification/ui/recording.py', 'verification/ui/profile.py', 'verification/ui/textwidth.swift', 'verification/ui/gestures.py']
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


def assert_separator_spans_row(shot, first_row, left, right):
    top = first_row['frame']['y']
    above, below = shot.rgb(right, top - 8), shot.rgb(right, top + 10)
    lines = [top + step / 3 for step in range(-12, 13)
             if not close(shot.rgb(right, top + step / 3), above, 3) and not close(shot.rgb(right, top + step / 3), below, 3)]
    assert lines, 'no separator under the level head'
    y = lines[len(lines) // 2]
    assert close(shot.rgb(left, y), shot.rgb(right, y), 4), \
        f'the separator under the level head does not reach x {left}: {shot.rgb(left, y)} vs {shot.rgb(right, y)}'


ui = UI(*sys.argv[1:])
open_profile(ui)
assert_tier_whole(ui)
scroll_to(ui, 'profile-accessory-scarf')
assert label(ui, 'profile-accessory-umbrella') == worn('umbrella')
assert label(ui, 'profile-accessory-backpack') == open_row('backpack')
assert label(ui, 'profile-accessory-scarf') == ui.t('reputation.profile.accessoryLockedA11y', name=name('scarf'), level=5)
row = by_id(ui.read(), 'profile-accessory-backpack')
assert row.get('type') == 'Button', row.get('type')
assert_touch_target(row, name('backpack'))
ui.at_rest()
shot = ui.snap('01-picker')
head, first = by_id(ui.read(), 'profile-level'), by_id(ui.read(), 'profile-accessory-red_hat')
assert_separator_spans_row(shot, first, head['frame']['x'] + 24, first['frame']['x'] + first['frame']['width'] - 60)

ui.tap('profile-accessory-umbrella', expect_change=False)
time.sleep(1.5)
assert not rep_calls(ui, 'setAccessory', 1, timeout=0), 'a tap on what you wear sent a write'

ui.tap('profile-accessory-backpack')
ui.wait_label('profile-accessory-backpack', lambda text: text == worn('backpack'), '书包 never became worn')
assert label(ui, 'profile-accessory-umbrella') == open_row('umbrella')
assert rep_calls(ui, 'setAccessory', 1) == [{'accessory': 'backpack'}], 'the write was not recorded'
assert len(rep_calls(ui, 'setAccessory', 2, timeout=2)) == 1, 'the write was sent twice'
ui.at_rest()
ui.capture('02-changed')
print('PASS: the picker shows what is worn, changes after the server answers and ignores a tap on the worn one')
