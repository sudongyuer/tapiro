"""The worst fixture on home: the long Malay title is cut so the name stays on the card (`shortTitle`, unit test), and VoiceOver
still reads the whole title."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, reach_home  # noqa: E402
from review import on_screen_row, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/app/review.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/Mascot.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py', 'src/features/home/', 'src/app/(tabs)/bounty/index.tsx', 'verification/ui/gestures.py']
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
assert by_id(items, CARD)['frame']['height'] < 120, 'the card grew past two lines'
ui.at_rest()
shot(ui, '01-worst')
print('PASS: the long card keeps its size and reads whole')
