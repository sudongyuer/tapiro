"""Under 已结清 on the status screen (238 A): one row 评价 小林 with the days left; it opens the sheet with the bounty's title;
after a sealed submit the row reads 已评价, 等小林评完一起公开 and 改一下 (242 A, 244 A), and 改一下 opens the stored review."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from profile import label  # noqa: E402
from review import SHEET, enabled, on_screen_row, shot, submit_happy  # noqa: E402

DEPS = ['src/features/reputation/', 'src/app/review.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/Mascot.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/InlineState.tsx', 'verification/ui/review.py', 'verification/ui/profile.py', 'src/features/bounty/status/', 'src/app/(tabs)/bounty/', 'verification/ui/gestures.py']
SCENE = 'bounty-status'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyStatus', 'settled', '-uiVerifyBountyRole', 'poster', '-uiVerifyReviews', 'one']
ROW = 'review-entry-fixture-person-lin'

ui = UI(*sys.argv[1:])
ui.element('bounty-status', timeout=45)
ui.element(ROW, timeout=30)
on_screen_row(ui, ROW)
text = label(ui, ROW)
assert ui.t('reputation.entry.review', name='小林') in text, text
assert ui.tn('reputation.entry.daysLeft', 7) in text, text
ui.at_rest()
shot(ui, '01-open')
ui.tap(ROW)
ui.element(SHEET, timeout=20)
ui.labelled(ui.t('reputation.sheet.title', name='小林'))
ui.wait_label('review-subtitle', lambda value: value.startswith('帮取快递 · '), 'the sheet lost the bounty title', 15)
submit_happy(ui)
ui.tap('review-sealed-ok')
ui.gone(SHEET)
ui.wait_label(ROW, lambda value: ui.t('reputation.entry.sealedMine', name='小林') in value, 'the row never read sealed', 20)
text = label(ui, ROW)
assert ui.t('reputation.entry.reviewed') in text and ui.t('reputation.entry.edit') in text, text
ui.at_rest()
shot(ui, '02-sealed')
ui.tap(ROW)
ui.element('review-chips-title', timeout=20)
assert not enabled(ui, 'review-submit'), 'the stored review did not open: 提交 is on with nothing changed'
print('PASS: the status row opens the sheet and turns sealed with 改一下')
