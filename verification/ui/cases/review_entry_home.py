"""Home (238 A): one card per pending review under the live cards; 评价 opens the sheet; once reviewed the card is gone and
the other stays. The worst fixture's long Malay title stays inside the card."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402
from profile import label  # noqa: E402
from review import SHEET, on_screen_row, shot, submit_happy  # noqa: E402

DEPS = ['src/features/reputation/', 'src/app/review.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/Mascot.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py', 'src/features/home/', 'src/app/(tabs)/bounty/index.tsx', 'verification/ui/gestures.py']
BUDGET = 240
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyReviews', 'many']
BOUNTY = 'home-review-bounty-fixture-bounty-settled-fixture-person-lin'
RIDE = 'home-review-ride-fixture-ride-closed-fixture-person-mei'

ui = UI(*sys.argv[1:])
reach_home(ui)
ui.element(BOUNTY, timeout=30)
card = on_screen_row(ui, BOUNTY)
text = label(ui, BOUNTY)
assert ui.t('reputation.home.helpedYou', title='帮取快递', name='小林') in text, text
assert ui.t('reputation.home.ask') in text, text
assert_touch_target(card, 'the home review card')
assert by_id(ui.read(), RIDE), 'the second pending review has no card'
ui.at_rest()
shot(ui, '01-cards')
ui.tap(BOUNTY)
ui.element(SHEET, timeout=20)
submit_happy(ui)
ui.tap('review-sealed-ok')
ui.gone(SHEET)
ui.gone(BOUNTY, timeout=20)
assert by_id(ui.read(), RIDE), 'the other card went too'
ui.at_rest()
shot(ui, '02-reviewed')
print('PASS: one card per pending review, gone once reviewed')
