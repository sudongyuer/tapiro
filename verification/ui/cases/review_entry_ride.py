"""A closed ride as the organiser (241 A): one row per rider: 评价 Mei with days left, 已评价 阿明 with 改一下, Aiman who reviewed
first, and 评价已结束 for Siti, which does not open. A long name is cut on screen and read whole by VoiceOver. The first row
opens the sheet with the rider's chips."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import label  # noqa: E402
from review import SHEET, on_screen_row, shot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/app/review.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/Mascot.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py', 'src/features/ride/detail/', 'src/app/(tabs)/ride/', 'verification/ui/gestures.py']
SCENE = 'ride-detail'
BUDGET = 240
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'settledOrganiser', '-uiVerifyReviews', 'many']
MEI, AMING = 'review-entry-fixture-person-mei', 'review-entry-fixture-person-aming'
AIMAN, SITI = 'review-entry-fixture-person-aiman', 'review-entry-fixture-person-siti'
LONG = 'Muhammad Aiman bin Abdullah Hakimi Zulkarnain'

ui = UI(*sys.argv[1:])
ui.element('ride-settle-sticker', timeout=45)
ui.element(MEI, timeout=30)
on_screen_row(ui, SITI)
assert ui.tn('reputation.entry.daysLeft', 6) in label(ui, MEI)
text = label(ui, AMING)
assert ui.t('reputation.entry.reviewed') in text and ui.t('reputation.entry.edit') in text, text
assert ui.t('reputation.entry.sealedMine', name='阿明') in text, text
assert ui.t('reputation.entry.sealedTheirs', name=LONG) in label(ui, AIMAN), label(ui, AIMAN)
text = label(ui, SITI)
assert ui.t('reputation.entry.ended') in text and 'Siti' in text, text
ui.at_rest()
shot(ui, '01-rows')
ui.tap(SITI)
assert by_id(ui.read(), SHEET) is None, '评价已结束 opened the sheet'
ui.tap(MEI)
ui.element(SHEET, timeout=20)
ui.element('review-face-happy', timeout=20)
ui.tap('review-face-happy')
ui.element('review-chip-considerate')
print('PASS: one row per rider in each state')
