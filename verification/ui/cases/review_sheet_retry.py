"""提交 stays on after a failed send (R8): the line says why, a tap on 提交 in place sends again and seals; after the
seal 取消 is gone and a pull closes at once."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from gestures import drag  # noqa: E402
from profile import rep_calls  # noqa: E402
from review import SHEET, enabled, open_sheet, sealed, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py', 'verification/ui/gestures.py']
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
ui.tap('review-submit')
ui.element('review-sealed-ok', timeout=20)
calls = rep_calls(ui, 'submitReview', 2)
assert len(calls) == 2 and calls[1]['draft']['chips'] == ['on_time'], calls
sealed(ui, '小林', 7)
ui.at_rest()
shot(ui, '01-sent')
assert by_id(ui.read(), 'review-envelope'), 'the seal shows no envelope'
assert not any(i.get('AXLabel') == ui.t('reputation.sheet.cancel') for i in ui.read()), '取消 stayed after the seal'
w = ui.read()[0]['frame']['width']
drag(ui, (w / 2, 72), (w / 2, ui.read()[0]['frame']['height'] * 0.8))
ui.gone(SHEET)
print('PASS: a failed send can be retried in place')
