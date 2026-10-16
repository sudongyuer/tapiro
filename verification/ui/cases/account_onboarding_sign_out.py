"""The name step offers a header sign-out action; it returns to welcome, and signing in again restarts onboarding."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, sign_in_apple  # noqa: E402

LOCALES = ['zh-Hans', 'ms']
SIGN_OUT = {'zh-Hans': '退出登录', 'ms': 'Daftar Keluar'}

ui = UI(*sys.argv[1:])
sign_in_apple(ui)
ui.element('name-input')
sign_out = ui.settled(lambda items: next((i for i in items if i.get('AXLabel') == SIGN_OUT[ui.locale]), None),
                      'sign-out header button missing')
shot = ui.capture('01-name-step')
assert_appearance(shot, ui.appearance, 20, 2500, 'name step background')

# iOS 26 bar buttons report their 36 pt glass capsule as the frame; UIKit hit-tests about 44 pt
# around it. Tapping 4 pt above the capsule proves the extended target.
f = sign_out['frame']
assert f['height'] >= 36 and f['width'] >= 44, f'sign-out header button is too small: {f}'
ui.tap_point(f['x'] + f['width'] / 2, f['y'] - 4)
ui.gone('name-input')
ui.element('sign-in-apple')
ui.at_rest()
ui.capture('02-welcome')

sign_in_apple(ui)
ui.element('name-input')
print('PASS: onboarding can be left by signing out, and starts again on the next sign-in')
