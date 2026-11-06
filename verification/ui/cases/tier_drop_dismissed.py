"""A dismissed drop does not come back: after 知道了 the app is relaunched with the fixture keeping what was marked seen
(as the server does), and the next open reads no pending drop and shows no sheet."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI  # noqa: E402
from profile import rep_calls  # noqa: E402
from tier_drop import SHEET, assert_not_shown, assert_seen_once, open_sheet  # noqa: E402

DEPS = ['src/features/reputation/', 'src/lib/i18n/locales/bounty/', 'src/features/account/', 'src/app/tier-drop.tsx', 'src/app/_layout.tsx', 'src/app/(tabs)/_layout.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/AppText.tsx', 'verification/ui/tier_drop.py', 'verification/ui/profile.py', 'verification/ui/board.py', 'verification/ui/bounty.py', 'verification/ui/choose.py']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyTierDrop', 'noShows']

ui = UI(*sys.argv[1:])
open_sheet(ui)
ui.tap('tier-drop-got-it')
ui.gone(SHEET)
assert_seen_once(ui, '知道了 did not mark the drop seen')
assert defaults(ui, 'uiVerifyTierDropSeen') == '1', 'the fixture did not keep the seen mark'
relaunch(ui, drop=[], keep_records=True)
ui.wait(lambda items: not rep_calls(ui, 'markTierDropSeen', 1, timeout=0), 'the call log still holds the last launch', 20)
assert_not_shown(ui)
ui.at_rest()
ui.capture('01-relaunched')
print('PASS: a dismissed drop stays away after a relaunch')
