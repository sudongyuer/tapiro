"""A build without Google client IDs shows only the Apple button; the Google button is not drawn."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target  # noqa: E402

DEPS = ['src/features/account/']

SCENE = 'sign-in'
ARGS = ['-uiVerifyProviders', 'apple']

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
ui.element('account-session-signedOut')
assert_touch_target(ui.element('sign-in-apple'), 'apple sign-in button')
ui.gone('sign-in-google', timeout=3)
ui.at_rest()
ui.capture('apple-only')
print('PASS: only the Apple button shows when Google is not configured')
