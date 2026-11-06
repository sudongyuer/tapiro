"""When the other side has already reviewed, the submit makes both public at once (R10): no envelope, the sheet reads
你们的评价都公开了 and 好的 closes it without asking anything."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import label  # noqa: E402
from review import SHEET, assert_one_submit, open_sheet, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'verification/ui/review.py', 'verification/ui/profile.py']
SCENE = 'review-sheet'
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']

ui = UI(*sys.argv[1:])
open_sheet(ui)
ui.element('review-face-okay', timeout=30)
ui.tap('review-face-okay')
ui.tap('review-submit')
ui.element('review-sealed-ok', timeout=20)
assert_one_submit(ui)
assert by_id(ui.read(), 'review-envelope') is None, 'a revealed review shows the envelope'
assert label(ui, 'review-sealed-title') == ui.t('reputation.sheet.revealedTitle')
assert label(ui, 'review-sealed-note') == ui.t('reputation.sheet.revealedNote', name='小林')
ui.at_rest()
shot(ui, '01-revealed')
ui.tap('review-sealed-ok')
ui.gone(SHEET)
print('PASS: a second submit reveals both without the seal')
