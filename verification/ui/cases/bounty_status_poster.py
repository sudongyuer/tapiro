"""Poster actions on the 7A status screen (62A, 8A, 58A). Done: 确认完成 opens the system confirmation as a popover from
that button, 确认完成 stacked above a visible 再看看, stating RM 8 for 阿杰; its 确认完成 sends confirm_bounty once and pushes the pay sheet for the payment in the reply. 有问题 opens a sheet
with an empty reason and 发送 disabled; once typed, 发送 is filled with the accent while 取消 stays plain glass, and the
n/140 counter sits in the footer under the card; with report_bounty_problem failing once, 发送 closes the sheet, 有问题 comes back
with 没发出去，再试一次 and nothing is resent; reopening shows the kept draft, and the second 发送 reaches 等阿杰处理: 阿杰点完成 stays done with its time and the next step reads 等阿杰处理 with
the reason. Cancel after selection from ⋯: the dialog hangs from ⋯ with the destructive action above a visible keep
button; the poster with 阿杰 30 minutes late reads 取消这单？ and that it counts against 阿杰, and 不取消 sends nothing;
the helper with a waiver left reads 不帮了？ and the waiver line, and 不帮了
cancels: the timeline keeps 小林选了你 and ends on 你退出了这单 with its time, with no pending steps after it. Close before selection: the applicant list's ⋯ offers a red 关掉这单, the sheet says this month's free post
comes back and the 3 applicants see it, and 关掉这单 sends close_bounty once and shows the closed state."""
import json
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import paste_into, relaunch, tap_sheet_action  # noqa: E402
from choose import defaults  # noqa: E402
from confirm import assert_dialog, tap  # noqa: E402
from driver import UI, by_id, close, luma, token  # noqa: E402

DEPS = ['src/features/bounty/status/', 'src/features/bounty/select/', 'src/features/bounty/shared/',
        'src/ui/SheetFrame.tsx', 'src/ui/SyncedTextField.tsx', 'src/ui/PillButton.tsx', 'modules/tapiro-kit/',
        'src/app/(tabs)/bounty/', 'src/app/pay/', 'verification/ui/bounty.py', 'verification/ui/choose.py', 'src/features/block/',
        'verification/ui/confirm.py', 'src/ui/confirm.ts', 'src/ui/HoldButton.tsx']
SCENE = 'bounty-status'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 480
FIRST = ['-uiVerifyBountyStatus', 'done', '-uiVerifyBountyRole', 'poster']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyStatus', 'done', '-uiVerifyBountyRole', 'poster',
        '-uiVerifyBountyPaymentId', 'fixture-owe', '-uiVerifyBountyStatusDelayMs', '3000']
CALLS = 'uiVerifyBountyStatusCalls'
REASON = 'Cup arrived broken'
PROMINENT_SHARE = 0.35

ui = UI(*sys.argv[1:])


def sent(name):
    text = defaults(ui, CALLS)
    return [call for call in (json.loads(text) if text else []) if call['name'] == name]


def wait_sent(name, count, timeout=20):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        found = sent(name)
        if len(found) >= count:
            return found
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
    raise AssertionError(f'{name} was sent {len(sent(name))} times, expected {count}')


def assert_not_sent(name, count=0):
    time.sleep(1.0)  # a stray send would reach the plist within this
    assert len(sent(name)) == count, f'{name} was sent {len(sent(name))} times, expected {count}'


def summary(key, **values):
    return ui.wait_label('bounty-status-summary', lambda text: text == ui.t(key, **values),
                         f'the summary never read {ui.t(key, **values)!r}')


def again(scene, ready, *args):
    relaunch(ui, drop=FIRST, add=['-uiVerifyScene', scene, *args], ready=ready)


def open_menu(item):
    ui.tap_label(ui.t('bounty.status.action.more'))
    ui.tap_label(item)


def sheet_reads(title, message):
    ui.labelled(title)
    ui.labelled(message)
    ui.at_rest()


def button(identifier):
    return ui.settled(lambda items: next((i for i in items if i.get('AXUniqueId') == identifier
                                          and i.get('type') == 'Button'), None), f'{identifier} never settled')


def tap_button(identifier):
    f = button(identifier)['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)


def accent_share(shot, f):
    accent = luma(token('--color-accent', ui.appearance))
    near = shot.count(f, lambda rgb: abs(luma(rgb) - accent) < 45)
    return near / (f['width'] * f['height'] * shot.scale ** 2)


def reason_field():
    return ui.settled(lambda items: by_id(items, 'bounty-issue-reason'), 'the reason field never settled')


summary('bounty.status.summary.poster.done')
ui.tap('bounty-status-action-confirm')
sheet_reads(ui.t('bounty.confirm.title', name='阿杰'), ui.t('bounty.confirm.body', name='阿杰', amount='RM\u00a08'))
assert_dialog(ui, ui.t('bounty.confirm.title', name='阿杰'), ui.t('bounty.confirm.confirm'), ui.t('bounty.confirm.cancel'),
              source='bounty-status-action-confirm')
ui.capture('01-confirm-sheet')
assert not sent('confirm_bounty'), 'confirm_bounty was sent before the sheet was answered'
tap_sheet_action(ui, ui.t('bounty.confirm.confirm'), 'bounty-status-action-confirm')
ui.wait(lambda items: (by_id(items, 'bounty-status-action-confirm') or {}).get('enabled') is False,
        '确认完成 shows no progress while confirm_bounty is in flight', timeout=5)
assert len(wait_sent('confirm_bounty', 1)) == 1
ui.element('pay-sheet', timeout=30)
ui.gone('pay-loading')
assert by_id(ui.read(), 'pay-load-failed') is None, 'the pay sheet did not load the payment from the reply'
ui.at_rest()
ui.capture('02-pay-sheet')
assert_not_sent('confirm_bounty', 1)

again(SCENE, 'bounty-status-step-selected', '-uiVerifyBountyStatus', 'done', '-uiVerifyBountyRole', 'poster',
      '-uiVerifyBountyStatusFail', 'report_bounty_problem')
summary('bounty.status.summary.poster.done')
ui.tap('bounty-status-action-reportIssue')
reason_field()
ui.labelled(ui.t('bounty.issue.title', name='阿杰'))
assert button('bounty-issue-send').get('enabled') is False, '发送 is enabled with an empty reason'
paste_into(ui, 'bounty-issue-reason', REASON)
ui.wait(lambda items: any(i.get('AXUniqueId') == 'bounty-issue-send' and i.get('type') == 'Button'
                          and i.get('enabled') is True for i in items), '发送 never enabled after typing')
ui.at_rest()
shot = ui.snap('03-issue-sheet')
filled = accent_share(shot, button('bounty-issue-send')['frame'])
plain = accent_share(shot, button('bounty-issue-cancel')['frame'])
print(f'accent share of 发送 {filled:.2f}, of 取消 {plain:.2f}')
assert filled >= PROMINENT_SHARE, f'发送 in the issue sheet is not filled with the accent ({filled:.2f} of its frame)'
assert plain < PROMINENT_SHARE, f'取消 looks filled too ({plain:.2f}), so the measure cannot tell'
counter, field = ui.element('bounty-issue-count')['frame'], reason_field()['frame']
assert counter['y'] >= field['y'] + field['height'], f'the counter is not under the reason: {counter} / {field}'
middle = counter['y'] + counter['height'] / 2
beside, ground, card = (shot.rgb(counter['x'] + counter['width'] + 4, middle), shot.rgb(3, middle),
                        shot.rgb(field['x'] - 4, field['y'] + field['height'] / 2))
assert close(beside, ground, 6), f'the counter sits on {beside}, not on the sheet ground {ground} under the card'
assert not close(card, ground, 6), f'the card {card} and the ground {ground} look alike, so the measure cannot tell'
tap_button('bounty-issue-send')
ui.gone('bounty-issue-reason')
ui.wait_label('bounty-status-failed', lambda text: text == ui.t('bounty.status.failed'),
              'no inline failure notice after report_bounty_problem failed')
ui.wait(lambda items: (by_id(items, 'bounty-status-action-reportIssue') or {}).get('enabled') is True,
        '有问题 did not come back after the failure')
summary('bounty.status.summary.poster.done')
assert [call['args']['reason'] for call in wait_sent('report_bounty_problem', 1)] == [REASON]
assert_not_sent('report_bounty_problem', 1)
ui.at_rest()
ui.capture('04-issue-failed')

ui.tap('bounty-status-action-reportIssue')
ui.wait(lambda items: (by_id(items, 'bounty-issue-reason') or {}).get('AXValue') == REASON,
        'the draft was not kept after the failure')
tap_button('bounty-issue-send')
summary('bounty.status.summary.poster.disputed', name='阿杰')
assert len(wait_sent('report_bounty_problem', 2)) == 2
ui.wait_label('bounty-status-step-confirmed',
              lambda text: text.startswith(ui.t('bounty.status.step.poster.waitFix', name='阿杰')) and REASON in text,
              'the reason is not on the 等阿杰处理 step')
completed = ui.element('bounty-status-step-completed').get('AXLabel') or ''
assert re.search(r'\d{1,2}:\d{2}', completed), f'点完成 lost its time: {completed!r}'
assert completed.endswith(ui.t('bounty.status.a11y.done')), completed
ui.gone('bounty-status-failed')
ui.at_rest()
ui.capture('05-issue-sent')

again(SCENE, 'bounty-status-step-selected', '-uiVerifyBountyStatus', 'assignedLate', '-uiVerifyBountyRole', 'poster')
summary('bounty.status.summary.poster.late', name='阿杰')
open_menu(ui.t('bounty.status.action.cancel'))
sheet_reads(ui.t('bounty.cancel.titlePoster'), ui.t('bounty.cancel.otherLate', name='阿杰'))
assert len(wait_sent('bounty_cancel_preview', 1)) == 1
_, keep = assert_dialog(ui, ui.t('bounty.cancel.titlePoster'), ui.t('bounty.cancel.confirmPoster'),
                        ui.t('bounty.cancel.keepPoster'), source_label=ui.t('bounty.status.action.more'))
ui.capture('06-cancel-other-late')
tap(ui, keep)
ui.wait(lambda items: not any(i.get('AXLabel') == ui.t('bounty.cancel.titlePoster') for i in items),
        'the dialog stayed open after 不取消')
assert_not_sent('cancel_bounty')
summary('bounty.status.summary.poster.late', name='阿杰')

again(SCENE, 'bounty-status-step-selected', '-uiVerifyBountyStatus', 'assigned', '-uiVerifyBountyRole', 'helper',
      '-uiVerifyBountyWaiver', 'available')
summary('bounty.status.summary.helper.assigned')
open_menu(ui.t('bounty.status.action.withdraw'))
sheet_reads(ui.t('bounty.cancel.titleHelper'), ui.t('bounty.cancel.waiverHelper', name='小林'))
yes, _ = assert_dialog(ui, ui.t('bounty.cancel.titleHelper'), ui.t('bounty.cancel.confirmHelper'),
                       ui.t('bounty.cancel.keepHelper'), source_label=ui.t('bounty.status.action.more'))
ui.capture('07-cancel-helper-waiver')
tap(ui, yes)
summary('bounty.status.summary.helper.cancelled')
assert len(wait_sent('cancel_bounty', 1)) == 1
ended = ui.wait_label('bounty-status-step-ended',
                      lambda text: text.startswith(ui.t('bounty.status.ended.helperYou')),
                      'the timeline does not end on 你退出了这单').get('AXLabel') or ''
assert re.search(r'\d{1,2}:\d{2}', ended), f'the end row has no time: {ended!r}'
assert ended.endswith(ui.t('bounty.status.a11y.ended')), ended
items = ui.read()
assert by_id(items, 'bounty-status-step-selected'), 'the done step before the cancel is gone'
for after in ('started', 'completed', 'confirmed', 'payment'):
    assert not by_id(items, f'bounty-status-step-{after}'), f'{after} is still drawn after the cancel'
ui.at_rest()
ui.capture('08-cancelled')

again('bounty-applicants', 'bounty-applicants-title', '-uiVerifyBountyStatus', 'open', '-uiVerifyBountyRole',
      'poster')
ui.settled(lambda items: by_id(items, 'bounty-select-hold'), 'the applicant list never settled')
open_menu(ui.t('bounty.close.menu'))
sheet_reads(ui.t('bounty.close.title'), ui.tn('bounty.close.free', 3))
yes, _ = assert_dialog(ui, ui.t('bounty.close.title'), ui.t('bounty.close.confirm'), ui.t('bounty.close.keep'),
                       source_label=ui.t('bounty.status.action.more'))
ui.capture('09-close-sheet')
assert not sent('close_bounty'), 'close_bounty was sent before the sheet was answered'
tap(ui, yes)
ui.element('bounty-applicants-closed', timeout=30)
assert len(wait_sent('close_bounty', 1)) == 1
assert_not_sent('close_bounty', 1)
ui.at_rest()
ui.capture('10-closed')
print('PASS: confirm sheet with the amount then the pay sheet, issue sheet with a failed send kept as a draft and a '
      'manual resend, cancel copy for the late helper and the helper waiver, close from the applicant list')
