"""Sign in with the fixture, set a name, pick a language, reach home, sign out and back in, then delete the account and land on welcome."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, assert_touch_target, sign_in_apple  # noqa: E402

DEPS = [
    'src/features/account/',
    'src/app/welcome.tsx',
    'src/app/onboarding/',
    'src/app/(tabs)/',
    'src/app/delete-account.tsx',
    'src/features/shell/',
    'src/features/home/',
]

LOCALES = ['zh-Hans', 'ms']
BUDGET = 200
NATIVE_NAME = {'zh-Hans': '中文', 'ms': 'Bahasa Melayu'}
NAME = 'Lin Mo'

ui = UI(*sys.argv[1:])


def value(identifier):
    return ui.element(identifier).get('AXValue') or ''


def sign_in():
    sign_in_apple(ui)


def open_me():
    ui.tap('tab-me')
    return ui.element('me-profile')


def open_settings():
    ui.tap('me-settings')
    ui.element('settings-delete')


ui.element('sign-in-apple')
ui.at_rest()
shot = ui.capture('01-welcome')
assert_appearance(shot, ui.appearance, 20, 2500, 'welcome background')

sign_in()
ui.wait(lambda items: any(i.get('AXUniqueId') == 'name-input' and '林小貘' in (i.get('AXValue') or '') for i in items),
        'name not prefilled from the fixture profile')
assert_touch_target(ui.element('name-input'), 'name field')
assert_touch_target(ui.element('name-continue'), 'continue button')
ui.capture('02-name-prefilled')

ui.tap('name-input')
ui.backspace(3)
ui.tap('name-continue')
ui.element('name-error')
ui.capture('03-name-empty')
ui.tap('name-input')
ui.type(NAME)
ui.wait(lambda items: any(i.get('AXUniqueId') == 'name-input' and i.get('AXValue') == NAME for i in items),
        f'name field does not read {NAME}')
ui.tap('name-continue')

done = ui.element('language-done')
assert_touch_target(done, 'get started button')
before = done.get('AXLabel')
ui.capture('04-language')
ui.tap_label('English')
ui.wait_label('language-done', lambda label: label == 'Get Started', 'language did not switch to English')
ui.tap_label(NATIVE_NAME[ui.locale])
ui.wait_label('language-done', lambda label: label == before, 'language did not switch back')
ui.tap('language-done')

ui.element('home-scroll')
ui.capture('05-home')
open_me()
ui.wait_label('me-profile', lambda label: NAME in label, 'me does not show the saved name')

open_settings()
ui.wait_label('settings-profile', lambda label: label.startswith(NAME), 'settings does not show the saved name')
ui.capture('06-settings')
ui.tap('settings-sign-out')
ui.gone('settings-sign-out')
ui.element('sign-in-apple')

sign_in()
ui.element('home-scroll')
open_me()
ui.wait_label('me-profile', lambda label: NAME in label, 'onboarded user did not go straight home')
open_settings()
ui.tap('settings-delete')
confirm = ui.element('delete-account-confirm')
assert_touch_target(confirm, 'delete button')
assert_touch_target(ui.element('delete-account-cancel'), 'cancel button')
ui.capture('07-delete-sheet')
ui.tap('delete-account-confirm')
ui.gone('delete-account-confirm')
ui.element('sign-in-apple', timeout=10)
ui.at_rest()
ui.capture('08-deleted-welcome')

sign_in()
ui.wait(lambda items: any(i.get('AXUniqueId') == 'name-input' and '林小貘' in (i.get('AXValue') or '') for i in items),
        'a deleted account did not start onboarding again with a fresh profile')
print('PASS: onboarding, home, settings, sign out, sign in, delete and re-onboarding')
