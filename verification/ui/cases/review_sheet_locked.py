"""The review went public while the sheet was open (`submitLocked` on an edit): the refusal reads 评价已经公开，不能再改了 as a
plain line, the sheet shows what went public read-only (only the picked chips, no field, no count, no 提交), and 关闭 closes
without asking."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import label  # noqa: E402
from review import SHEET, enabled, open_sheet, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/ocr.py', 'verification/ui/profile.py']
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
chips = [i for i in items if (i.get('AXUniqueId') or '').startswith('review-chip-')]
shown = sorted(i['AXUniqueId'] for i in chips)
assert shown == ['review-chip-good_company', 'review-chip-on_time'], f'the sheet shows {shown}, not the two chips that went public'
live = [i['AXUniqueId'] for i in chips if 'checkbox' in (i.get('AXValue') or '') or i.get('type') == 'Button']
assert not live, f'chips still look pickable on a public review: {live}'
for gone in ('review-submit', 'review-count', 'review-sentence'):
    assert by_id(items, gone) is None, f'{gone} is still shown on a review that can no longer change'
ui.at_rest()
shot(ui, '01-locked')
ui.tap_label(ui.t('reputation.sheet.close'))
ui.gone(SHEET)
print('PASS: a review gone public shows as it is, locked, and closing asks nothing')
