"""248 A, a drop for negative reviews only: the reason counts the reviews that named something that went wrong, the
way back asks for more settled items and good reviews (no new people); 看我的主页 closes the sheet, marks it seen and
pushes your own profile in 我的."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, selected  # noqa: E402
from profile import open_profile, rep_calls  # noqa: E402
from tier_drop import SHEET, assert_seen_once, assert_sheet, open_sheet, plural, way_back  # noqa: E402

DEPS = ['src/features/reputation/', 'src/lib/i18n/locales/bounty/', 'src/features/account/', 'src/app/tier-drop.tsx', 'src/app/_layout.tsx', 'src/app/(tabs)/_layout.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/AppText.tsx', 'verification/ui/tier_drop.py', 'verification/ui/profile.py', 'verification/ui/board.py', 'verification/ui/choose.py']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyTierDrop', 'reviews']
SELF_ID = '00000000-0000-4000-8000-000000000001'

ui = UI(*sys.argv[1:])
open_sheet(ui)
assert_sheet(ui, 'reliable', [plural(ui, 'reviews', 2)], way_back(ui, 'very_reliable', settled=2, reviews=3))
ui.capture('01-sheet')
ui.tap('tier-drop-profile')
ui.gone(SHEET)
open_profile(ui)
ui.element('profile-level')
assert selected(ui.read()) == ['tab-me'], f'看我的主页 opened the profile outside 我的: {selected(ui.read())}'
assert [call['personId'] for call in rep_calls(ui, 'profile', 1)] == [SELF_ID], '看我的主页 opened someone else'
assert_seen_once(ui, '看我的主页 did not mark the drop seen')
ui.at_rest()
ui.capture('02-profile')
print('PASS: the reviews sheet and 看我的主页')
