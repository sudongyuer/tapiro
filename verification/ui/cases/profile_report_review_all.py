"""全部评价 (259 A): long-press a review there opens the same report sheet, and 取消 returns to the list; a review I wrote
myself has no menu, even where its reviewer would be hidden."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import (open_profile, rep_calls, report_review, review_id,  # noqa: E402
                     scroll_to, tap_button)

DEPS = ['src/features/reputation/', 'src/app/(tabs)/', 'src/ui/TierMark.tsx', 'src/ui/Avatar.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/Mascot.tsx', 'src/lib/report.ts', 'src/lib/i18n/locales/reputation/', 'src/lib/i18n/locales/chat/', 'src/features/block/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
SCENE = 'profile'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson', 'fixture-person-mei']

ui = UI(*sys.argv[1:])
open_profile(ui)
scroll_to(ui, 'profile-all-reviews')
ui.tap('profile-all-reviews')
ui.element('profile-reviews', timeout=30)

report_review(ui, review_id(1))
ui.labelled(ui.t('reputation.report.reasons'))
ui.at_rest()
ui.capture('01-report')
tap_button(ui, ui.t('chat.report.cancel'))
ui.gone('profile-report', timeout=30)
assert rep_calls(ui, 'reportReview', 1, timeout=1) == [], 'closing the sheet sent a report'

scroll_to(ui, review_id(4))
ui.at_rest()
ui.press(review_id(4), 1.2)
time.sleep(1)  # the menu of review 1 had risen by now
items = ui.read()
assert not [i for i in items if i.get('AXLabel') == ui.t('chat.thread.report')], 'my own review offers 举报'
assert by_id(items, 'profile-reviews'), 'the list went away'
ui.capture('02-own-review')
print('PASS: 全部评价 reports a review and my own review has no menu')
