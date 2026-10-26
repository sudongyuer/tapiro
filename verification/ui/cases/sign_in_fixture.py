"""Verify mode starts signed out and signs in as the fixture user after tapping a provider button."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, assert_touch_target  # noqa: E402

DEPS = ['src/features/account/']

SCENE = 'sign-in'
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
ui.element('account-session-signedOut')
for provider in ('apple', 'google'):
    assert_touch_target(ui.element(f'sign-in-{provider}'), f'{provider} sign-in button')
ui.at_rest()
shot = ui.capture('signed-out')
assert_appearance(shot, ui.appearance, 60, 300, 'navigation bar')
assert_appearance(shot, ui.appearance, 20, 2500, 'screen background')

ui.tap('sign-in-apple')
signed_in = ui.element('account-session-signedIn', timeout=10)
assert '林小貘' in (signed_in.get('AXLabel') or ''), f'fixture user missing: {signed_in.get("AXLabel")}'
ui.capture('signed-in')
print('PASS: signed out, then signed in as the fixture user after tapping Apple')
