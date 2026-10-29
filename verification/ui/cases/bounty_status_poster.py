"""Poster actions on the 7A status screen (62A, 8A, 58A). Done: 确认完成 opens a system action sheet that states RM 8 for
阿杰; its 确认完成 sends confirm_bounty once and pushes the pay sheet for the payment in the reply. 有问题 opens a sheet
with an empty reason and 发送 disabled; with report_bounty_problem failing once, 发送 closes the sheet, 有问题 comes back
with 没发出去，再试一次 and nothing is resent; reopening shows the kept draft, and the second 发送 reaches 等阿杰处理 with
the reason in the timeline. Cancel after selection from ⋯: the poster with 阿杰 30 minutes late reads 取消这单？ and that it
counts against 阿杰, and 不取消 sends nothing; the helper with a waiver left reads 不帮了？ and the waiver line, and 不帮了
cancels. Close before selection: the applicant list's ⋯ offers a red 关掉这单, the sheet says this month's free post
comes back and the 3 applicants see it, and 关掉这单 sends close_bounty once and shows the closed state."""
import json
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch, tap_sheet_action  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/bounty/status/', 'src/features/bounty/select/', 'src/features/bounty/shared/',
        'src/ui/SheetFrame.tsx', 'src/ui/SyncedTextField.tsx', 'src/ui/PillButton.tsx', 'modules/tapiro-kit/',
        'src/app/(tabs)/bounty/', 'src/app/pay/', 'verification/ui/bounty.py', 'verification/ui/choose.py']
SCENE = 'bounty-status'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 480
FIRST = ['-uiVerifyBountyStatus', 'done', '-uiVerifyBountyRole', 'poster']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyStatus', 'done', '-uiVerifyBountyRole', 'poster',
        '-uiVerifyBountyPaymentId', 'fixture-owe', '-uiVerifyBountyStatusDelayMs', '3000']
CALLS = 'uiVerifyBountyStatusCalls'
REASON = 'Cup arrived broken'

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


def reason_field():
    return ui.settled(lambda items: by_id(items, 'bounty-issue-reason'), 'the reason field never settled')


summary('bounty.status.summary.poster.done')
ui.tap('bounty-status-action-confirm')
sheet_reads(ui.t('bounty.confirm.title', name='阿杰'), ui.t('bounty.confirm.body', name='阿杰', amount='8'))
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
ui.type(REASON)
ui.wait(lambda items: (by_id(items, 'bounty-issue-reason') or {}).get('AXValue') == REASON,
        f'the reason does not read {REASON!r}')
ui.wait(lambda items: any(i.get('AXUniqueId') == 'bounty-issue-send' and i.get('type') == 'Button'
                          and i.get('enabled') is True for i in items), '发送 never enabled after typing')
ui.at_rest()
ui.capture('03-issue-sheet')
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
ui.wait_label('bounty-status-step-completed', lambda text: REASON in text, 'the reason is not in the timeline')
ui.gone('bounty-status-failed')
ui.at_rest()
ui.capture('05-issue-sent')

again(SCENE, 'bounty-status-step-selected', '-uiVerifyBountyStatus', 'assignedLate', '-uiVerifyBountyRole', 'poster')
summary('bounty.status.summary.poster.late', name='阿杰')
open_menu(ui.t('bounty.status.action.cancel'))
sheet_reads(ui.t('bounty.cancel.titlePoster'), ui.t('bounty.cancel.otherLate', name='阿杰'))
assert len(wait_sent('bounty_cancel_preview', 1)) == 1
ui.capture('06-cancel-other-late')
tap_sheet_action(ui, ui.t('bounty.cancel.keepPoster'), '')
assert_not_sent('cancel_bounty')
summary('bounty.status.summary.poster.late', name='阿杰')

again(SCENE, 'bounty-status-step-selected', '-uiVerifyBountyStatus', 'assigned', '-uiVerifyBountyRole', 'helper',
      '-uiVerifyBountyWaiver', 'available')
summary('bounty.status.summary.helper.assigned')
open_menu(ui.t('bounty.status.action.withdraw'))
sheet_reads(ui.t('bounty.cancel.titleHelper'), ui.t('bounty.cancel.waiverHelper', name='小林'))
ui.capture('07-cancel-helper-waiver')
tap_sheet_action(ui, ui.t('bounty.cancel.confirmHelper'), '')
summary('bounty.status.summary.helper.cancelled')
assert len(wait_sent('cancel_bounty', 1)) == 1
ui.at_rest()
ui.capture('08-cancelled')

again('bounty-applicants', 'bounty-applicants-title', '-uiVerifyBountyStatus', 'open', '-uiVerifyBountyRole',
      'poster')
ui.settled(lambda items: by_id(items, 'bounty-select-hold'), 'the applicant list never settled')
open_menu(ui.t('bounty.close.menu'))
sheet_reads(ui.t('bounty.close.title'), ui.tn('bounty.close.free', 3))
ui.capture('09-close-sheet')
assert not sent('close_bounty'), 'close_bounty was sent before the sheet was answered'
tap_sheet_action(ui, ui.t('bounty.close.confirm'), '')
ui.element('bounty-applicants-closed', timeout=30)
assert len(wait_sent('close_bounty', 1)) == 1
assert_not_sent('close_bounty', 1)
ui.at_rest()
ui.capture('10-closed')
print('PASS: confirm sheet with the amount then the pay sheet, issue sheet with a failed send kept as a draft and a '
      'manual resend, cancel copy for the late helper and the helper waiver, close from the applicant list')
