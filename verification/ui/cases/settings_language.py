"""Choosing English in settings switches the settings screen to English at once, and choosing the launch language switches it back."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance  # noqa: E402

DEPS = ['src/features/account/', 'src/app/(tabs)/me/']

SCENE = 'settings'

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
other = ui.other_locale()
ui.wait_label('settings-sign-out', lambda label: label == ui.t('account.settings.signOut'), 'settings did not open in the launch language')
ui.capture('01-launch-language')
ui.tap_label(ui.t('languages.' + other))
ui.wait_label('settings-sign-out', lambda label: label == ui.t_in(other, 'account.settings.signOut'), f'settings did not switch to {other}')
shot = ui.capture(f'02-{other}')
assert_appearance(shot, ui.appearance, 20, 2500, 'screen background')
ui.tap_label(ui.t('languages.' + ui.locale))
ui.wait_label('settings-sign-out', lambda label: label == ui.t('account.settings.signOut'), 'settings did not switch back')
ui.capture('03-switched-back')
print('PASS: settings language switch')
