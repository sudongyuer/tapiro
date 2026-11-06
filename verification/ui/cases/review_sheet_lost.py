"""The server took the review but the answer was lost (`submitLost`): the reload shows the review as stored, so the sheet
seals instead of saying 没提交成功, the draft is gone, and nothing was sent twice."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import rep_calls  # noqa: E402
from review import open_sheet, sealed, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py']
SCENE = 'review-sheet'
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyReviews', 'one', '-uiVerifyRepFail', 'submitLost']

ui = UI(*sys.argv[1:])
open_sheet(ui)
ui.element('review-face-happy', timeout=30)
ui.tap('review-face-happy')
ui.element('review-submit')
ui.tap('review-submit')
ui.element('review-sealed-ok', timeout=20)
assert by_id(ui.read(), 'review-failed') is None, 'a stored review reads as failed'
sealed(ui, '小林', 7)
assert rep_calls(ui, 'submitReview', 1, timeout=15), 'nothing was submitted'
time.sleep(2)  # a replay would follow the lost answer
assert len(rep_calls(ui, 'submitReview', 2, timeout=2)) == 1, 'the review was sent twice'
ui.at_rest()
shot(ui, '01-sealed')
print('PASS: a lost answer does not read as a failure')
