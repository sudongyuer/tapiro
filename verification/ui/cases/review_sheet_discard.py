"""A discard asks first (239 A): 取消 with a draft asks 放弃这条评价？; 继续写 stays with the draft; 留着草稿 closes and the draft
is there on reopening; 放弃 closes and clears it; pulling the sheet down asks the same; with nothing written it closes."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from gestures import drag  # noqa: E402
from review import SHEET, open_sheet, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py', 'verification/ui/gestures.py']
SCENE = 'review-sheet'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyReviews', 'one']


def cancel():
    ui.tap_label(ui.t('reputation.sheet.cancel'))


def asked():
    ui.labelled(ui.t('reputation.sheet.discardTitle'))


def answer(key):
    ui.tap_label(ui.t(f'reputation.sheet.{key}'))


def reopen():
    ui.gone(SHEET)
    ui.tap('review-reopen')
    ui.element('review-face-happy', timeout=30)


ui = UI(*sys.argv[1:])
open_sheet(ui)
ui.element('review-face-happy', timeout=30)
cancel()
reopen()

ui.tap('review-face-happy')
ui.element('review-chip-on_time')
ui.tap('review-chip-on_time')
cancel()
asked()
ui.at_rest()
shot(ui, '01-asked')
answer('discardContinue')
ui.element('review-submit')
assert by_id(ui.read(), SHEET), '继续写 closed the sheet'

cancel()
asked()
answer('discardKeep')
reopen()
ui.element('review-chip-on_time', timeout=15)
assert by_id(ui.read(), 'review-chip-on_time').get('AXValue') == 'checkbox, checked', 'the kept draft lost its chip'
ui.at_rest()
shot(ui, '02-kept')

items = ui.read()
w, h = items[0]['frame']['width'], items[0]['frame']['height']
drag(ui, (w / 2, 72), (w / 2, h * 0.8))
asked()
answer('discardDrop')
reopen()
items = ui.read()
assert by_id(items, 'review-submit') is None and by_id(items, 'review-chip-on_time') is None, '放弃 kept the draft'
ui.at_rest()
shot(ui, '03-dropped')
print('PASS: 继续写 stays, 留着草稿 keeps, 放弃 clears, a pull asks too')
