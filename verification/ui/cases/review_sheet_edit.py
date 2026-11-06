"""改一下 (244 A): a review still sealed opens the same sheet with what was picked; 提交 stays off until something changes;
the edit is the same submit, and the seal plays again (here on the Reduce Motion path, a fade); an unchanged close
asks nothing."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from review import SHEET, assert_one_submit, enabled, open_sheet, sealed, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py']
SCENE = 'review-sheet'
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyReviewKind', 'ride', '-uiVerifyReviewItem', 'fixture-ride-closed', '-uiVerifyReviewPerson', 'fixture-person-aming', '-uiVerifyReduceMotion', '1']

ui = UI(*sys.argv[1:])
open_sheet(ui)
ui.element('review-chip-on_time', timeout=30)
assert not enabled(ui, 'review-submit'), '提交 is on with nothing changed'
ui.at_rest()
shot(ui, '01-stored')

ui.tap_label(ui.t('reputation.sheet.cancel'))
ui.gone(SHEET)
ui.tap('review-reopen')
ui.element('review-chip-on_time', timeout=30)

ui.tap('review-chip-on_time')
ui.wait(lambda _: enabled(ui, 'review-submit'), '提交 stayed off after a change')
ui.tap('review-submit')
ui.element('review-sealed-ok', timeout=20)
call = assert_one_submit(ui)
assert call['draft']['chips'] == ['good_company'], call
sealed(ui, '阿明', 6)
ui.at_rest()
shot(ui, '02-sealed-again')
print('PASS: the sheet opens with the stored review, an edit needs a change and seals again')
