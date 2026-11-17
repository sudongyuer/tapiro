"""The review sheet over the software keyboard, with the longest title, name and chips: focusing the sentence keeps the
field between the header and the keyboard, and the content scrolls only as far as the field needs, so nothing slides
under the header when the field already had room."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, bottom, by_id  # noqa: E402
from review import header_bottom, keyboard_top, open_sheet, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/lib/uiVerify.ts', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx', 'src/lib/i18n/locales/reputation/', 'verification/ui/review.py', 'verification/ui/profile.py', 'verification/ui/ocr.py']
SCENE = 'review-sheet'
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyReviews', 'worst', '-uiVerifyReviewPerson', 'fixture-person-aiman', '-uiVerifyReviewTitle', 'Ambil bungkusan besar dari Sunway Pyramid ke Sunway Geo Residences blok C tingkat 23']
LOCALES = ['zh-Hans', 'ms']
NAME = 'Muhammad Aiman bin Abdullah Hakimi Zulkarnain'

ui = UI(*sys.argv[1:])
open_sheet(ui)
ui.element('review-face-unhappy', timeout=30)
ui.tap('review-face-unhappy')
ui.element('review-sentence')
items = ui.read()
header = header_bottom(ui, items, NAME)
subtitle = by_id(items, 'review-subtitle')['frame']['y']
field = bottom(by_id(items, 'review-sentence'))
assert subtitle >= header, f'the item line starts under the header: y {subtitle}, header ends at {header}'

ui.tap('review-sentence')
keyboard = keyboard_top(ui)
items = ui.read()
focused = by_id(items, 'review-sentence')['frame']
assert focused['y'] >= header, f'the focused field is under the header: {focused}'
assert bottom(by_id(items, 'review-sentence')) <= keyboard + 1, f'the keyboard at {keyboard} covers the focused field: {focused}'
needed = max(0, field - keyboard)
moved = subtitle - by_id(items, 'review-subtitle')['frame']['y']
assert abs(moved - needed) <= 2, f'the content moved {moved} pt for a field that needed {needed} pt'
ui.at_rest()
shot(ui, '01-focused')
print('PASS: the focused sentence stays between the header and the keyboard')
