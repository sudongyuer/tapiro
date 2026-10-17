"""With no live items, the calm card greets a 40-character display name without clipping the ask button."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402

ARGS = ['-uiVerifyFixture', 'worst', '-uiVerifyShellFeed', 'none', '-uiVerifySignedIn', 'onboarded']
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
reach_home(ui)
card = ui.wait_label('live-card-calm', lambda label: 'Muhammad Hafiz Haikal bin Mohd Yusof Ali' in label,
                     'calm card does not greet the 40-character name')
items = ui.read()
assert_touch_target(by_id(items, 'home-ask'), 'home-ask')
ui.snap('01-calm')
print('PASS: calm card with a 40-character name')
