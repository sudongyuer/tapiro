"""While sending (R7, 257 board): the pill reads 提交中 with a spinner, 取消 and the form are off, a pull neither closes the
sheet nor asks anything, and the seal starts only after the server answers."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from gestures import drag  # noqa: E402
from profile import label  # noqa: E402
from review import SHEET, enabled, open_sheet, sealed, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py', 'verification/ui/gestures.py']
SCENE = 'review-sheet'
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyReviews', 'one', '-uiVerifyRepDelayMs', '20000']

ui = UI(*sys.argv[1:])
ui.element('review-face-happy', timeout=60)
ui.tap('review-face-happy')
ui.element('review-submit')
ui.tap('review-submit')
ui.wait_label('review-submit', lambda text: text == ui.t('reputation.sheet.submitting'), 'no 提交中 while sending', 8)
assert by_id(ui.read(), 'review-sealed-ok') is None, 'the seal started before the answer'
assert not enabled(ui, 'review-face-okay'), 'a face is still live while sending'
shot(ui, '01-sending')
items = ui.read()
w, h = items[0]['frame']['width'], items[0]['frame']['height']
drag(ui, (w / 2, 72), (w / 2, h * 0.8))
deadline = time.monotonic() + 2.5
while time.monotonic() < deadline:
    items = ui.read()
    assert by_id(items, SHEET), 'the sheet closed while sending'
    assert not any(i.get('AXLabel') == ui.t('reputation.sheet.discardTitle') for i in items), 'a pull asked while sending'
ui.element('review-sealed-ok', timeout=40)
assert label(ui, 'review-sealed-title') == ui.t('reputation.sheet.sealedTitle', name='小林')
sealed(ui, '小林', 7)
print('PASS: sending locks the sheet and the seal waits for the answer')
