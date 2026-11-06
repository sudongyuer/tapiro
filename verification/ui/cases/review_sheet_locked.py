"""The review went public while the sheet was open (`submitLocked` on an edit): the refusal reads 评价已经公开，不能再改了, the
form shows what went public rather than the edit, nothing is live, and closing asks nothing."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import label  # noqa: E402
from review import SHEET, enabled, open_sheet, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py']
SCENE = 'review-sheet'
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyReviews', 'many', '-uiVerifyReviewKind', 'ride', '-uiVerifyReviewItem', 'fixture-ride-closed', '-uiVerifyReviewPerson', 'fixture-person-aming', '-uiVerifyRepFail', 'submitLocked']

ui = UI(*sys.argv[1:])
open_sheet(ui)
ui.element('review-chip-on_time', timeout=30)
ui.tap('review-chip-on_time')
ui.wait(lambda _: enabled(ui, 'review-submit'), '提交 stayed off after a change')
ui.tap('review-submit')
ui.element('review-failed', timeout=20)
assert ui.t('reputation.sheet.locked') in label(ui, 'review-failed')
items = ui.read()
assert by_id(items, 'review-chip-on_time').get('AXValue') == 'checkbox, checked', 'the sheet shows the edit, not what went public'
assert not enabled(ui, 'review-submit'), '提交 is on for a public review'
assert not enabled(ui, 'review-chip-careful' if by_id(items, 'review-chip-careful') else 'review-chip-on_time'), 'a chip is live'
ui.at_rest()
shot(ui, '01-locked')
ui.tap_label(ui.t('reputation.sheet.cancel'))
ui.gone(SHEET)
print('PASS: a review gone public shows as it is, locked, and closing asks nothing')
