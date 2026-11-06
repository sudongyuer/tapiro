"""Report a review on someone else's profile (259 A): long-press 小林's review → 举报 opens the report sheet with the face,
chips and sentence quoted, 为什么举报这条评价？ and the four reasons; a failed 提交 keeps the sheet and sends nothing on its
own; 提交 again sends one report for that review and offers to block 小林, whose name the review shows; 取消 closes it and
the review stays. A ride review with its reviewer hidden (256 A) reports the same way, but names nobody and offers no
block: 收到了，我们会看 and OK."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import (assert_tier_whole, open_profile, rep_calls, report_review, review_id,  # noqa: E402
                     submit_report, tap_button)

DEPS = ['src/features/reputation/', 'src/app/(tabs)/', 'src/ui/TierMark.tsx', 'src/ui/Avatar.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/Mascot.tsx', 'src/lib/report.ts', 'src/lib/i18n/locales/reputation/', 'src/lib/i18n/locales/chat/', 'src/features/block/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py', 'verification/ui/textwidth.swift']
SCENE = 'profile'
BUDGET = 300
LOCALES = ['zh-Hans', 'en', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson', 'fixture-person-mei', '-uiVerifyRepFail', 'report']

ui = UI(*sys.argv[1:])
open_profile(ui)
assert_tier_whole(ui)
report_review(ui, review_id(2), '00-menu')
quote = ui.element('profile-report-quote').get('AXLabel') or ''
assert ui.t('reputation.face.unhappy') in quote and ui.t('reputation.chip.helper.late') in quote, quote
assert '等了 40 分钟' in quote, quote
assert '小林' not in quote, quote
ui.labelled(ui.t('reputation.report.reasons'))
ui.tap_label(ui.t('chat.report.reason.harassment'))
ui.at_rest()
ui.capture('01-report')
submit_report(ui)
ui.element('profile-report-failed', timeout=30)
assert by_id(ui.read(), 'profile-report'), 'the sheet closed after a failed report'
time.sleep(2)  # a replay would follow the failed answer
assert len(rep_calls(ui, 'reportReview', 2, timeout=2)) == 1, 'the failed report was sent again on its own'
ui.at_rest()
ui.capture('02-failed')

submit_report(ui)
ui.labelled(ui.t('chat.report.offerBlock', name='小林'))
calls = rep_calls(ui, 'reportReview', 2)
expected = {'reviewId': 'fixture-profile-review-002', 'reason': 'harassment', 'note': None}
assert calls == [expected] * 2, calls
assert rep_calls(ui, 'reportPerson', 1, timeout=1) == [], 'a review report also reported a person'
ui.at_rest()
ui.capture('03-offer')
tap_button(ui, ui.t('block.confirm.cancel'))
ui.gone('profile-report', timeout=30)
assert by_id(ui.read(), review_id(2)), 'a report hid the review'

report_review(ui, review_id(3))
ui.tap_label(ui.t('chat.report.reason.other'))
submit_report(ui)
ui.labelled(ui.t('chat.thread.reported'))
items = ui.read()
offers = [i for i in items if ui.t('block.confirm.confirm') == i.get('AXLabel')]
assert not offers, 'a hidden reviewer was offered for blocking'
calls = rep_calls(ui, 'reportReview', 3)
assert calls[-1] == {'reviewId': 'fixture-profile-review-003', 'reason': 'other', 'note': None}, calls
ui.at_rest()
ui.capture('04-hidden')
tap_button(ui, ui.t('chat.thread.ok'))
ui.gone('profile-report', timeout=30)
print('PASS: a review reports with its copy quoted, once per tap, and a hidden reviewer stays hidden')
