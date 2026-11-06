"""The other side's lines on the status screen (242 A): when they reviewed first the row says so with the days left and no
content; a submit makes both public and the row reads 评价已公开 with no way back into the sheet. A failed read reads 评价没加载
出来 with 重试, never an empty screen."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import label  # noqa: E402
from review import SHEET, on_screen_row, shot, submit_happy  # noqa: E402

DEPS = ['src/features/reputation/', 'src/app/review.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/Mascot.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py', 'src/features/bounty/status/', 'src/app/(tabs)/bounty/']
SCENE = 'bounty-status'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyStatus', 'settled', '-uiVerifyBountyRole', 'poster', '-uiVerifyReviews', 'many', '-uiVerifyRepFail', 'state']
LOCALES = ['zh-Hans', 'ms']
ROW = 'review-entry-fixture-person-lin'

ui = UI(*sys.argv[1:])
ui.element('bounty-status', timeout=45)
ui.element('review-entries-failed', timeout=30)
assert ui.t('reputation.entry.failed') in label(ui, 'review-entries-failed')
assert by_id(ui.read(), ROW) is None, 'a failed read shows a row'
ui.at_rest()
shot(ui, '01-failed')
ui.tap('review-entries-retry')
ui.element(ROW, timeout=20)
on_screen_row(ui, ROW)
text = label(ui, ROW)
assert ui.t('reputation.entry.sealedTheirs', name='小林') in text, text
assert ui.tn('reputation.entry.daysLeft', 7) in text, text
ui.at_rest()
shot(ui, '02-they-reviewed')
ui.tap(ROW)
ui.element(SHEET, timeout=20)
submit_happy(ui)
ui.tap('review-sealed-ok')
ui.gone(SHEET)
ui.wait_label(ROW, lambda value: ui.t('reputation.entry.public') in value, 'the row never read public', 20)
assert ui.t('reputation.face.happy') in label(ui, ROW)
assert by_id(ui.read(), ROW).get('type') != 'Button', 'a public review still opens the sheet'
ui.at_rest()
shot(ui, '03-public')
print('PASS: the waiting line, the reveal and the failed read')
