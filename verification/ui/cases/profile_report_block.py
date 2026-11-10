"""⋯ on someone else's profile: 举报 Mei opens the report sheet (为什么举报Mei？, the four reasons); a failed 提交
(`-uiVerifyRepFail report`) keeps the sheet and the reason with 没举报成功 and sends nothing on its own; 提交 again records
one person report with no message and offers 「收到了，我们会看。也屏蔽Mei？」; 屏蔽 closes the sheet, the profile reads
你屏蔽了Mei and ⋯ now offers 解除屏蔽 Mei, which asks first and clears the line."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import label, menu_more, open_profile, rep_calls, tap_button, tap_item  # noqa: E402

DEPS = ['src/features/reputation/', 'src/app/(tabs)/', 'src/ui/TierMark.tsx', 'src/ui/Avatar.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/Mascot.tsx', 'src/lib/report.ts', 'src/lib/i18n/locales/reputation/', 'src/features/block/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
SCENE = 'profile'
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson', 'fixture-person-mei', '-uiVerifyRepFail', 'report', '-uiVerifyBlockDelayMs', '800']


def submit():
    found = ui.wait(lambda items: next((i for i in items if i.get('AXLabel') == ui.t('chat.report.submit')
                                        and i.get('type') == 'Button' and i.get('enabled') is True), None),
                    '提交 is not live')
    f = found['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)


ui = UI(*sys.argv[1:])
open_profile(ui)
menu_more(ui)
tap_item(ui, ui.t('reputation.profile.report', name='Mei'))
ui.element('profile-report', timeout=30)
ui.labelled(ui.t('chat.report.reasons', name='Mei'))
ui.tap_label(ui.t('chat.report.reason.off_platform_payment'))
ui.at_rest()
ui.capture('01-report')
submit()
ui.element('profile-report-failed', timeout=30)
assert by_id(ui.read(), 'profile-report'), 'the sheet closed after a failed report'
assert rep_calls(ui, 'reportPerson', 1, timeout=15), 'the first report never reached the call log'
time.sleep(2)  # a replay would follow the failed answer
sent = rep_calls(ui, 'reportPerson', 2, timeout=2)
assert len(sent) == 1, f'the failed report was sent again on its own: {sent}'
ui.at_rest()
ui.capture('02-failed')

submit()
ui.labelled(ui.t('chat.report.offerBlock', name='Mei'))
calls = rep_calls(ui, 'reportPerson', 2)
assert calls == [{'personId': 'fixture-person-mei', 'reason': 'off_platform_payment', 'note': None}] * 2, calls
ui.at_rest()
ui.capture('03-offer')
tap_button(ui, ui.t('block.confirm.confirm'))
ui.gone('profile-report', timeout=30)
blocked = ui.element('profile-blocked', timeout=30)
assert blocked.get('AXLabel') == ui.t('reputation.profile.blocked', name='Mei'), blocked.get('AXLabel')
ui.at_rest()
ui.capture('04-blocked')

menu_more(ui)
tap_item(ui, ui.t('reputation.profile.unblock', name='Mei'))
ui.labelled(ui.t('block.unblock.title', name='Mei'))
tap_button(ui, ui.t('block.unblock.confirm'))
ui.gone('profile-blocked', timeout=30)
menu_more(ui)
ui.labelled(ui.t('reputation.profile.block', name='Mei'))
ui.at_rest()
ui.capture('05-unblocked')
print('PASS: ⋯ reports the person once per tap, offers a block, and blocking and unblocking show on the profile')
