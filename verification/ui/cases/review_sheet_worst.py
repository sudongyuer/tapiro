"""Worst case: the longest name and the poster's Malay chips wrap inside the sheet, nothing runs off its edge; the long
sealed copy wraps above 好的."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from review import open_sheet, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/ui/Mascot.tsx', 'src/ui/mascotPaint.ts', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py']
SCENE = 'review-sheet'
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyReviews', 'worst', '-uiVerifyReviewPerson', 'fixture-person-aiman', '-uiVerifyReviewTitle', 'Ambil bungkusan besar dari Sunway Pyramid ke Sunway Geo Residences blok C tingkat 23']
LOCALES = ['zh-Hans', 'ms']
CHIPS = ('not_as_described', 'slow_to_pay', 'changed_ask', 'rude')

ui = UI(*sys.argv[1:])
open_sheet(ui)
ui.element('review-face-unhappy', timeout=30)
ui.tap('review-face-unhappy')
ui.element('review-chip-changed_ask')
items = ui.read()
width = items[0]['frame']['width']
for chip in CHIPS:
    frame = by_id(items, f'review-chip-{chip}')['frame']
    assert frame['x'] >= 0 and frame['x'] + frame['width'] <= width, f'{chip} runs off the sheet: {frame}'
    ui.tap(f'review-chip-{chip}')
assert by_id(ui.read(), 'review-submit'), '提交 is missing'
ui.at_rest()
shot(ui, '01-long-chips')
ui.tap('review-submit')
ui.element('review-sealed-ok', timeout=20)
items = ui.read()
title, note = by_id(items, 'review-sealed-title')['frame'], by_id(items, 'review-sealed-note')['frame']
ok = by_id(items, 'review-sealed-ok')['frame']
assert note['y'] + note['height'] <= ok['y'], 'the sealed copy runs into 好的'
assert title['height'] > 40, f'the long sealed title did not wrap: {title}'
ui.at_rest()
shot(ui, '02-sealed')
print('PASS: long chips and names wrap inside the sheet')
