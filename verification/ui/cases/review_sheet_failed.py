"""A failed submit (-uiVerifyRepFail submit) keeps the sheet and the draft, says why, and sends nothing on its own; the
draft survives closing and reopening; 提交 again goes through and seals. A failed first read shows 没加载出来 with 重试,
never an empty form."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import label, rep_calls  # noqa: E402
from review import SHEET, enabled, sealed, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py']
SCENE = 'review-sheet'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyReviews', 'one', '-uiVerifyRepFail', 'state,submit']

ui = UI(*sys.argv[1:])
ui.element('review-unavailable', timeout=45)
assert ui.t('reputation.profile.failed') in label(ui, 'review-unavailable')
assert by_id(ui.read(), 'review-face-happy') is None, 'a failed read shows the form'
ui.at_rest()
shot(ui, '01-read-failed')
ui.tap('review-retry')
ui.element('review-face-happy', timeout=30)

ui.tap('review-face-okay')
ui.element('review-chip-late')
ui.tap('review-chip-late')
ui.tap('review-sentence')
ui.type('Sorry')
ui.tap('review-submit')
ui.element('review-failed', timeout=20)
assert ui.t('reputation.sheet.failed') in label(ui, 'review-failed')
assert by_id(ui.read(), 'review-sentence').get('AXValue') == 'Sorry', 'the sentence was lost'
assert rep_calls(ui, 'submitReview', 1, timeout=15), 'nothing was submitted'
time.sleep(2)  # a replay would follow the failed answer
assert len(rep_calls(ui, 'submitReview', 2, timeout=2)) == 1, 'the failed review was sent again on its own'
ui.at_rest()
shot(ui, '02-failed')

ui.tap_label(ui.t('reputation.sheet.cancel'))
ui.labelled(ui.t('reputation.sheet.discardTitle'))
ui.tap_label(ui.t('reputation.sheet.discardKeep'))
ui.gone(SHEET)
ui.tap('review-reopen')
ui.element('review-sentence', timeout=30)
assert by_id(ui.read(), 'review-sentence').get('AXValue') == 'Sorry', 'the draft did not survive closing'
assert by_id(ui.read(), 'review-failed') is None, 'the old failure came back'
assert enabled(ui, 'review-submit'), '提交 is off after reopening'
ui.tap('review-submit')
ui.element('review-sealed-ok', timeout=20)
calls = rep_calls(ui, 'submitReview', 2)
assert len(calls) == 2 and calls[1]['draft'] == {'face': 'okay', 'chips': ['late'], 'sentence': 'Sorry'}, calls
sealed(ui, '小林', 7)
ui.at_rest()
shot(ui, '03-sent')
print('PASS: a failure keeps the draft and sends nothing by itself; the user retries')
