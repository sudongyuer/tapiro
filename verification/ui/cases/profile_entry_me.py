"""Entry from 我的: the name row is a button with a chevron and the hint 看我的主页; a tap pushes your own profile in the 我的
tab (one read for your id) with the level card, and back returns with the row deselected."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, reach_home  # noqa: E402
from profile import open_profile, rep_calls  # noqa: E402

DEPS = ['src/features/account/MeView.tsx', 'src/app/(tabs)/me/', 'src/features/reputation/profile/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']

ui = UI(*sys.argv[1:])
reach_home(ui)
ui.tap('tab-me')
row = ui.element('me-profile', timeout=30)
assert row.get('type') == 'Button', row.get('type')
assert_touch_target(row, '我的名字那行')
ui.tap('me-profile')
open_profile(ui)
assert [call['personId'] for call in rep_calls(ui, 'profile', 1)] == ['00000000-0000-4000-8000-000000000001']
ui.element('profile-level')
ui.at_rest()
ui.capture('01-self')
ui.tap('BackButton')
ui.gone('profile-screen')
ui.element('me-profile')
print('PASS: the 我的 name row pushes your own profile')
