"""提交 stays on after a failed send (R8): the line says why, a tap on 提交 in place sends again and seals, and editing
clears the line."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import rep_calls  # noqa: E402
from review import enabled, open_sheet, sealed, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py']
SCENE = 'review-sheet'
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyReviews', 'one', '-uiVerifyRepFail', 'submit']

ui = UI(*sys.argv[1:])
open_sheet(ui)
ui.element('review-face-happy', timeout=30)
ui.tap('review-face-happy')
ui.element('review-chip-on_time')
ui.tap('review-chip-on_time')
ui.tap('review-submit')
ui.element('review-failed', timeout=20)
assert enabled(ui, 'review-submit'), '提交 is off after a failure'
ui.tap('review-chip-careful')
ui.wait(lambda items: by_id(items, 'review-failed') is None, 'editing did not clear the failure line', 10)
ui.tap('review-submit')
ui.element('review-sealed-ok', timeout=20)
calls = rep_calls(ui, 'submitReview', 2)
assert len(calls) == 2 and calls[1]['draft']['chips'] == ['on_time', 'careful'], calls
sealed(ui, '小林', 7)
ui.at_rest()
shot(ui, '01-sent')
print('PASS: a failed send can be retried in place')
