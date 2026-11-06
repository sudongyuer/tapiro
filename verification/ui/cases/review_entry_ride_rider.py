"""A closed ride as a rider (241 A): one row, the organiser's, and it opens the organiser's chips; the other riders are not
offered."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from profile import label  # noqa: E402
from review import SHEET, on_screen_row, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/app/review.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/Mascot.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py', 'src/features/ride/detail/', 'src/app/(tabs)/ride/', 'verification/ui/gestures.py']
SCENE = 'ride-detail'
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'settled', '-uiVerifyRideDetailId', 'ride-scene-rider', '-uiVerifyReviews', 'one']
ROW = 'review-entry-fixture-person-lin'

ui = UI(*sys.argv[1:])
ui.element('ride-settle-sticker', timeout=45)
ui.element(ROW, timeout=30)
on_screen_row(ui, ROW)
assert ui.t('reputation.entry.review', name='小林') in label(ui, ROW)
rows = [i for i in ui.read() if (i.get('AXUniqueId') or '').startswith('review-entry-')]
assert len(rows) == 1, rows
ui.at_rest()
shot(ui, '01-row')
ui.tap(ROW)
ui.element(SHEET, timeout=20)
ui.element('review-face-happy', timeout=20)
ui.tap('review-face-happy')
ui.element('review-chip-left_on_time')
print('PASS: a rider reviews the organiser only')
