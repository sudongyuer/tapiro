"""The review sheet (239 A, 240 A, 257 a1): 评价小林 with the item and date; no 提交 before a face; 开心 shows the good
chips of a helper, 不开心 the not-good ones and drops the good ones picked; 提交 sends the face, chips and sentence once;
the server's answer plays the seal, and the sealed copy with the days left and 好的 closes the sheet. Focusing the sentence
leaves the item line and the faces where they were, under the header, with the field above the keyboard, and VoiceOver
reads the field's name once. In dark the envelope's cream rim runs all the way round. Motion: one appearance with video."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, Shot, assert_touch_target, bottom, by_id, close, token  # noqa: E402
from profile import label  # noqa: E402
from review import SHEET, assert_one_submit, header_bottom, keyboard_top, open_sheet, sealed, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/ocr.py', 'verification/ui/profile.py']
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
SENTENCE = ui.t('reputation.sheet.sentence')
assert label(ui, 'review-sentence') == SENTENCE, f"the empty field reads {label(ui, 'review-sentence')!r}"
PINNED = ('review-subtitle', 'review-face-happy', 'review-face-unhappy')


def tops():
    items = ui.read()
    return {name: by_id(items, name)['frame']['y'] for name in PINNED}


def assert_in_place(when):
    items = ui.read()
    header = header_bottom(ui, items, '小林')
    for name in PINNED:
        y = by_id(items, name)['frame']['y']
        assert y >= header, f'{name} is under the header {when}: y {y}, header ends at {header}'
        assert abs(y - rest[name]) <= 1, f'{name} moved {when}: {rest[name]} -> {y}'


rest = tops()
ui.tap('review-sentence')
keyboard = keyboard_top(ui)
assert_in_place('with the field focused')
assert bottom(by_id(ui.read(), 'review-sentence')) <= keyboard, 'the keyboard covers the sentence field'
ui.type('Thanks')
ui.wait_label('review-count', lambda text: text == ui.t('reputation.reply.countLabel', count=6, max=200),
              'the count does not read 6 of 200')
assert_in_place('after typing')
assert label(ui, 'review-sentence') == SENTENCE, f"the filled field reads {label(ui, 'review-sentence')!r}"
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
sealed_shot = shot(ui, '03-sealed')
if ui.appearance == 'dark':
    items = ui.read()
    envelope = by_id(items, 'review-envelope')['frame']
    rim = token('--color-mascot-saddle', 'dark')
    edge = {'x': envelope['x'] + 20, 'width': 30, 'y': envelope['y'] + envelope['height'] - 1.5, 'height': 1.5}
    lit = Shot(sealed_shot, items[0]['frame']['width']).count(edge, lambda rgb: close(rgb, rim, 60))
    assert lit >= 30, f'the envelope has no cream rim along its bottom edge: {lit} px'
ui.tap('review-sealed-ok')
ui.gone(SHEET)
ui.element('review-reopen', timeout=15)
print('PASS: pick, chips by face, submit once, the seal and its copy, 好的 closes')
