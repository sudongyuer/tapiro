"""The name step offers a header sign-out action; it first asks 退出登录？ in a system sheet from that button (O4), where
继续填写 keeps the name step and 退出登录 returns to welcome; signing in again restarts onboarding."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from confirm import assert_dialog, button  # noqa: E402
from driver import UI, assert_appearance, sign_in_apple  # noqa: E402

DEPS = ['src/features/account/', 'src/app/welcome.tsx', 'src/app/onboarding/', 'src/ui/confirm.ts',
        'modules/tapiro-kit/ios/ConfirmDialog.swift', 'verification/ui/confirm.py']

LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])


def tap_action(label):
    found = ui.settled(lambda items: button(items, label), f'the sheet has no {label}')['frame']
    ui.tap_point(found['x'] + found['width'] / 2, found['y'] + found['height'] / 2)


def ask_sign_out():
    assert_dialog(ui, ui.t('account.name.signOutTitle'), ui.t('account.name.signOut'), ui.t('account.name.signOutKeep'),
                  source_label=ui.t('account.name.signOut'))

sign_in_apple(ui)
ui.element('name-input')
sign_out = ui.settled(lambda items: next((i for i in items if i.get('AXLabel') == ui.t('account.name.signOut')), None),
                      'sign-out header button missing')
shot = ui.capture('01-name-step')
assert_appearance(shot, ui.appearance, 20, 2500, 'name step background')

# iOS 26 bar buttons report their 36 pt glass capsule as the frame; UIKit hit-tests about 44 pt
# around it. Tapping 4 pt above the capsule proves the extended target.
f = sign_out['frame']
assert f['height'] >= 36 and f['width'] >= 44, f'sign-out header button is too small: {f}'
ui.tap_point(f['x'] + f['width'] / 2, f['y'] - 4)
ask_sign_out()
ui.capture('01a-confirm')
tap_action(ui.t('account.name.signOutKeep'))
ui.wait(lambda items: not any(i.get('AXLabel') == ui.t('account.name.signOutTitle') for i in items) and items,
        '继续填写 did not close the sheet')
ui.element('name-input')
ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)
ask_sign_out()
tap_action(ui.t('account.name.signOut'))
ui.gone('name-input')
ui.element('sign-in-apple')
ui.at_rest()
ui.capture('02-welcome')

sign_in_apple(ui)
ui.element('name-input')
print('PASS: signing out of onboarding asks first, 继续填写 stays, 退出登录 leaves, and the next sign-in starts again')
