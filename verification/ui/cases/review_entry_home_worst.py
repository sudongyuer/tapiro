"""The worst fixture on home: the long Malay title ends in an ellipsis on its own line and the long name is cut
(`shortName`, unit test), so what the person did is still on the card; VoiceOver reads the whole title and name.

The card's text is read by OCR: the accessibility tree reports the whole label of a cut Text."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, reach_home  # noqa: E402
from review import loose, on_screen_row, read_shot, text_inside  # noqa: E402

DEPS = ['src/features/reputation/', 'src/app/review.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/Mascot.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py', 'src/features/home/', 'src/app/(tabs)/bounty/index.tsx', 'verification/ui/gestures.py', 'verification/ui/ocr.py']
BUDGET = 200
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyReviews', 'worst']
CARD = 'home-review-bounty-fixture-bounty-settled-fixture-person-aiman'

ui = UI(*sys.argv[1:])
reach_home(ui)
ui.element(CARD, timeout=30)
on_screen_row(ui, CARD)
items = ui.read()
assert 'Ambil bungkusan besar dari Sunway Pyramid ke Sunway Geo Residences blok C tingkat 23' in by_id(items, CARD).get('AXLabel'), 'VoiceOver lost the title'
NAME = 'Muhammad Aiman bin Abdullah Hakimi Zulkarnain'
assert NAME in by_id(items, CARD).get('AXLabel'), 'VoiceOver lost the name'
assert by_id(items, CARD)['frame']['height'] < 120, 'the card grew past four lines'
ui.at_rest()
_, read = read_shot(ui, '01-worst')
did = max(ui.t('reputation.home.helpedYou', name='\x00').split('\x00'), key=len)
drawn = text_inside(read, by_id(ui.read(), CARD)['frame'])
assert loose(did) in drawn, f'the card lost what the person did ({did.strip()}): {drawn}'
print('PASS: the long card keeps its size and reads whole')
