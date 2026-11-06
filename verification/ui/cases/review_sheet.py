"""The review sheet (239 A, 240 A, 257 a1): 评价小林 with the item and date; no 提交 before a face; 开心 shows the good
chips of a helper, 不开心 the not-good ones and drops the good ones picked; 提交 sends the face, chips and sentence once;
the server's answer plays the seal, and the sealed copy with the days left and 好的 closes the sheet. Motion: one
appearance with video."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from profile import label  # noqa: E402
from review import SHEET, assert_one_submit, open_sheet, sealed, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py']
SCENE = 'review-sheet'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyReviews', 'one', '-uiVerifyReviewTitle', '帮取快递', '-uiVerifyRepDelayMs', '400']
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
open_sheet(ui)
ui.element('review-face-happy', timeout=30)
ui.labelled(ui.t('reputation.sheet.title', name='小林'))
assert label(ui, 'review-subtitle').startswith('帮取快递 · ')
items = ui.read()
assert by_id(items, 'review-submit') is None and by_id(items, 'review-sentence') is None, '提交 shows before a face'
ui.at_rest()
shot(ui, '01-faces')

ui.tap('review-face-happy')
ui.element('review-chip-on_time')
assert label(ui, 'review-chips-title') == ui.t('reputation.sheet.goodChips')
for chip in ('careful', 'kept_posted', 'extra_kind'):
    assert by_id(ui.read(), f'review-chip-{chip}'), f'{chip} is missing'
assert_touch_target(by_id(ui.read(), 'review-face-okay'), 'the okay face')
ui.tap('review-chip-on_time')
ui.tap('review-face-unhappy')
ui.element('review-chip-late')
assert label(ui, 'review-chips-title') == ui.t('reputation.sheet.badChips')
assert by_id(ui.read(), 'review-chip-on_time') is None, 'a good chip stayed under 不开心'
ui.tap('review-face-happy')
ui.element('review-chip-on_time')
ui.tap('review-chip-on_time')
ui.tap('review-chip-extra_kind')
ui.tap('review-sentence')
ui.type('Thanks')
ui.wait_label('review-count', lambda text: text == ui.t('reputation.reply.countLabel', count=6, max=200),
              'the count does not read 6 of 200')
ui.at_rest()
shot(ui, '02-filled')

ui.tap('review-submit')
ui.element('review-sealed-ok', timeout=20)
call = assert_one_submit(ui)
assert call['draft'] == {'face': 'happy', 'chips': ['on_time', 'extra_kind'], 'sentence': 'Thanks'}, call
assert call['target']['reviewee'] == 'fixture-person-lin', call
sealed(ui, '小林', 7)
assert by_id(ui.read(), 'review-submit') is None, 'the hidden form is still in the accessibility tree'
ui.at_rest()
shot(ui, '03-sealed')
ui.tap('review-sealed-ok')
ui.gone(SHEET)
ui.element('review-reopen', timeout=15)
print('PASS: pick, chips by face, submit once, the seal and its copy, 好的 closes')
