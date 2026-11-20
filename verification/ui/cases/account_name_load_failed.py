"""When the profile fails to load, the name step does not prefill the provider name: it shows a warning with a 44 pt 重试,
no name field, and 继续 is disabled, so a returning user's chosen name and photo are never overwritten."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/account/NameStep.tsx', 'src/app/onboarding/']
SCENE = 'profile-setup'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyProfileLoad', 'failed']

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
failed = ui.element('name-load-failed')
assert ui.t('account.name.loadFailed') in (failed.get('AXLabel') or ''), failed.get('AXLabel')
assert_touch_target(ui.element('name-retry'), 'name-retry')
items = ui.read()
assert by_id(items, 'name-input') is None, 'the name field is editable before the profile is known'
button = by_id(items, 'name-continue')
assert button and button.get('enabled') is False, f'继续 is enabled before the profile is known: {button}'
ui.capture('01-failed')
print('PASS: name step waits for the profile')
