"""A failed refresh on the closed ride keeps the rows and says they are from last time, with 重试 (E5); 重试 brings them back to
current and the line goes away."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from gestures import pull  # noqa: E402
from profile import label  # noqa: E402
from review import shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/lib/i18n/locales/reputation/', 'src/ui/NoticeCard.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py', 'verification/ui/gestures.py', 'src/features/ride/detail/', 'src/app/(tabs)/ride/']
SCENE = 'ride-detail'
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'settledOrganiser', '-uiVerifyReviews', 'one', '-uiVerifyRepFail', 'stateAgain']
ROW = 'review-entry-fixture-person-mei'

ui = UI(*sys.argv[1:])
ui.element('ride-settle-sticker', timeout=45)
ui.element(ROW, timeout=30)
pull(ui, ui.read())
ui.element('review-entries-stale', timeout=20)
assert ui.t('reputation.entry.stale') in label(ui, 'review-entries-stale')
assert by_id(ui.read(), ROW), 'a failed refresh dropped the row'
ui.at_rest()
shot(ui, '01-stale')
ui.tap('review-entries-retry')
ui.gone('review-entries-stale', timeout=20)
assert by_id(ui.read(), ROW), 'the row went after a good read'
print('PASS: a failed refresh is marked and can be retried')
