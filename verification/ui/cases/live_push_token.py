"""Push token registration (spec, Permission and Push copy): with provisional authorisation the signed-in app registers its
Expo push token once with register_push_token in the app language; choosing another language in settings registers this
device again with that language (not set_push_language, which would change every device), and choosing the launch
language again does the same; 退出登录 sends unregister_push_token for the same token before the session ends and lands on
welcome. The verify build replaces the token and the RPCs at their boundary and records each call in the defaults key
uiVerifyPushCalls."""
import json
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from choose import defaults  # noqa: E402
from driver import UI, reach_home  # noqa: E402

DEPS = ['src/lib/push/', 'src/lib/notifications/', 'src/features/account/', 'src/app/(tabs)/_layout.tsx',
        'src/app/(tabs)/me/', 'verification/ui/choose.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyNotifications', 'provisional']
KEY = 'uiVerifyPushCalls'
TOKEN = 'ExponentPushToken[uiVerify]'

ui = UI(*sys.argv[1:])


def calls():
    text = defaults(ui, KEY)
    return json.loads(text) if text else []


def wait_calls(expected):
    ui.wait(lambda items: calls() == expected or None, f'push calls are {calls()}, not {expected}', timeout=30)


registered = {'name': 'register_push_token', 'args': {'token': TOKEN, 'language': ui.locale}}
reach_home(ui)
wait_calls([registered])

ui.tap('tab-me')
ui.tap('me-settings')
other = ui.other_locale()
ui.wait_label('settings-sign-out', lambda label: label == ui.t('account.settings.signOut'), 'settings did not open')
ui.tap_label(ui.t('languages.' + other))
ui.wait_label('settings-sign-out', lambda label: label == ui.t_in(other, 'account.settings.signOut'),
              f'settings did not switch to {other}')
language = {'name': 'register_push_token', 'args': {'token': TOKEN, 'language': other}}
wait_calls([registered, language])
ui.capture('01-language')
ui.tap_label(ui.t_in(other, 'languages.' + ui.locale))
ui.wait_label('settings-sign-out', lambda label: label == ui.t('account.settings.signOut'), 'settings did not switch back')
back = registered
wait_calls([registered, language, back])

ui.tap('settings-sign-out')
ui.element('sign-in-apple', timeout=30)
wait_calls([registered, language, back, {'name': 'unregister_push_token', 'args': {'token': TOKEN}}])
ui.at_rest()
ui.capture('02-signed-out')
print('PASS: the token registers in the app language, follows a language change and is removed on sign-out')
