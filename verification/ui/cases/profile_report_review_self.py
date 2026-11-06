"""Your own profile (259 A): the person a review is about can report it. Long-press a review → 举报 sends one report and
offers to block its reviewer; 回复 under another review still opens the reply sheet."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from profile import (open_profile, rep_calls, report_review, review_id,  # noqa: E402
                     scroll_to, submit_report, tap_button)

DEPS = ['src/features/reputation/', 'src/app/(tabs)/', 'src/ui/TierMark.tsx', 'src/ui/Avatar.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/Mascot.tsx', 'src/lib/report.ts', 'src/lib/i18n/locales/reputation/', 'src/lib/i18n/locales/chat/', 'src/features/block/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
SCENE = 'profile'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson', '00000000-0000-4000-8000-000000000001', '-uiVerifyProfileTab', 'me']

ui = UI(*sys.argv[1:])
open_profile(ui)
report_review(ui, review_id(2))
ui.tap_label(ui.t('chat.report.reason.inappropriate'))
submit_report(ui)
ui.labelled(ui.t('chat.report.offerBlock', name='小林'))
calls = rep_calls(ui, 'reportReview', 1)
assert calls == [{'reviewId': 'fixture-profile-review-002', 'reason': 'inappropriate', 'note': None}], calls
ui.at_rest()
ui.capture('01-offer')
tap_button(ui, ui.t('block.confirm.cancel'))
ui.gone('profile-report', timeout=30)

reply = f'{review_id(1)}-reply-button'
scroll_to(ui, reply)
ui.at_rest()  # a tap during the sheet's dismissal or the drag's settle lands on nothing
ui.tap(reply)
ui.element('profile-reply', timeout=30)
ui.at_rest()
ui.capture('02-reply')
print('PASS: my own profile reports a review about me and 回复 still works')
