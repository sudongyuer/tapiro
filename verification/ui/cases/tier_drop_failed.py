"""A failed pending-drop read (`-uiVerifyRepFail tierDrop`) with a drop waiting shows no sheet and marks nothing seen:
a failure is never shown as a drop, nor as "no drop" to the server."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from tier_drop import assert_not_shown, seen_ids  # noqa: E402

DEPS = ['src/features/reputation/', 'src/lib/i18n/locales/bounty/', 'src/features/account/', 'src/app/tier-drop.tsx', 'src/app/_layout.tsx', 'src/app/(tabs)/_layout.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/AppText.tsx', 'verification/ui/tier_drop.py', 'verification/ui/profile.py', 'verification/ui/board.py', 'verification/ui/choose.py']
BUDGET = 150
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyTierDrop', 'noShows',
        '-uiVerifyRepFail', 'tierDrop']

ui = UI(*sys.argv[1:])
ui.element('home-scroll', timeout=45)
assert_not_shown(ui)
assert not seen_ids(ui, timeout=2), 'a failed read marked the drop seen'
ui.at_rest()
ui.capture('01-home')
print('PASS: a failed read shows no sheet and marks nothing')
