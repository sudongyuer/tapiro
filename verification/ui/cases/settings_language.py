"""Choosing English in settings switches the settings screen to English at once, and choosing the launch language switches it back."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance  # noqa: E402

DEPS = ['src/features/account/', 'src/app/(tabs)/me/', 'src/debug/', 'src/app/debug/']

SCENE = 'settings'
NATIVE_NAME = {'zh-Hans': '中文', 'ms': 'Bahasa Melayu'}
SIGN_OUT = {'zh-Hans': '退出登录', 'ms': 'Daftar Keluar'}

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
ui.wait_label('settings-sign-out', lambda label: label == SIGN_OUT[ui.locale], 'settings did not open in the launch language')
ui.capture('01-launch-language')
ui.tap_label('English')
ui.wait_label('settings-sign-out', lambda label: label == 'Sign Out', 'settings did not switch to English')
shot = ui.capture('02-english')
assert_appearance(shot, ui.appearance, 20, 2500, 'screen background')
ui.tap_label(NATIVE_NAME[ui.locale])
ui.wait_label('settings-sign-out', lambda label: label == SIGN_OUT[ui.locale], 'settings did not switch back')
ui.capture('03-switched-back')
print('PASS: settings language switch')
