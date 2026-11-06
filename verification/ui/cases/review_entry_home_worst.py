"""The worst fixture on home: a long Malay title and name wrap to two lines inside the card, and 评价 stays whole."""
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
frame = by_id(items, CARD)['frame']
assert frame['x'] >= 0 and frame['x'] + frame['width'] <= items[0]['frame']['width'], frame
ui.at_rest()
shot(ui, '01-worst')
print('PASS: the long card stays inside the screen')
