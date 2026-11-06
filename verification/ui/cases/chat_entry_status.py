"""发消息 on the bounty status screen (126 A). An assigned bounty's poster, with no pinned action of their own, sees one
grey 发消息 at the bottom; with the thread lookup failing once, a tap shows 对话没打开 and nothing opens, and the next tap
opens the bounty's thread in 消息 (the tab switches, the tab bar hides, the safety card and 阿杰's messages show) with the
消息 list under it. A done bounty puts 发消息 beside 确认完成 on one row, 发消息 on the left and narrower, 有问题 below. The
grey buttons are opaque, also dimmed while 确认完成 is sending: the 精确地址 card scrolled under the bar does not show
beside their labels in the run's appearance (light per PR, dark at milestones). An
open bounty, before anyone is chosen, has no thread and no 发消息."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import assert_fill_hides_content, relaunch, tap_sheet_action  # noqa: E402
from chat import chat_calls, sheet_action, tab_bar_hidden  # noqa: E402
from driver import UI, Shot, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/bounty/status/', 'src/features/chat/', 'src/app/(tabs)/bounty/status/', 'src/ui/PillButton.tsx',
        'src/ui/SheetFrame.tsx', 'modules/tapiro-kit/ios/PinnedBarView.swift', 'src/app/(tabs)/messages/',
        'verification/ui/chat.py', 'verification/ui/bounty.py']
SCENE = 'bounty-status'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
FIRST = ['-uiVerifyBountyStatus', 'assigned']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyChatFail', 'find', '-uiVerifyBountyRole', 'poster', '-uiVerifyBountyStatus', 'assigned']

ui = UI(*sys.argv[1:])


def assert_opaque(path, items, *identifiers):
    shot = Shot(path, items[0]['frame']['width'])
    behind = by_id(items, 'bounty-status-address')
    assert behind, 'the 精确地址 card is missing'
    for identifier in identifiers:
        assert_fill_hides_content(shot, by_id(items, identifier), behind['frame'], identifier)


message = ui.element('bounty-status-message', timeout=45)
assert message.get('AXLabel') == ui.t('bounty.status.action.message'), message.get('AXLabel')
assert_touch_target(message, 'bounty-status-message')
ui.at_rest()
items = ui.read()
assert_opaque(ui.capture('01-assigned'), items, 'bounty-status-message')

ui.tap('bounty-status-message')
ui.labelled(ui.t('chat.entry.failed'), timeout=20)
ui.capture('02-lookup-failed')
sheet_action(ui, ui.t('chat.entry.ok'))
items = ui.read()
assert by_id(items, 'bounty-status-message'), 'a failed lookup left the status screen'
assert by_id(items, 'chat-safety') is None, 'a failed lookup opened a thread'

ui.tap('bounty-status-message')
ui.element('chat-safety', timeout=45)
ui.labelled('阿杰')
assert tab_bar_hidden(ui.read()), 'the tab bar stays in a thread opened from the status screen'
found = chat_calls(ui, 'findThread', 2)
assert [call['itemId'] for call in found] == ['fixture-bounty-01'] * 2, found
ui.at_rest()
ui.capture('03-thread')

ui.tap('BackButton')
ui.element('chat-list', timeout=30)
ui.wait(lambda items: str((by_id(items, 'tab-messages') or {}).get('AXValue')) == '1', '消息 is not selected')
ui.capture('04-list-under')

relaunch(ui, drop=FIRST, add=['-uiVerifyBountyStatus', 'done', '-uiVerifyScene', SCENE,
                              '-uiVerifyBountyStatusDelayMs', '8000'], ready='bounty-status-message')
ui.settled(lambda items: by_id(items, 'bounty-status-action-confirm'), 'the done bounty never showed 确认完成')
items = ui.read()
chat_button = by_id(items, 'bounty-status-message')['frame']
confirm = by_id(items, 'bounty-status-action-confirm')['frame']
issue = by_id(items, 'bounty-status-action-reportIssue')['frame']
assert abs(chat_button['y'] - confirm['y']) < 1, f'发消息 {chat_button} and 确认完成 {confirm} are not on one row'
assert chat_button['x'] + chat_button['width'] <= confirm['x'], '发消息 is not left of 确认完成'
assert chat_button['width'] < confirm['width'], '发消息 is wider than the main action'
assert issue['y'] >= confirm['y'] + confirm['height'], '有问题 is not below the row'
ui.at_rest()
assert_opaque(ui.capture('05-done-row'), ui.read(), 'bounty-status-message', 'bounty-status-action-reportIssue')

ui.tap('bounty-status-action-confirm')
tap_sheet_action(ui, ui.t('bounty.confirm.confirm'), 'bounty-status-action-confirm')
locked = ui.wait(lambda items: items if (by_id(items, 'bounty-status-action-reportIssue') or {}).get('enabled') is False
                 else None, '有问题 never dimmed while confirm_bounty was in flight', timeout=5)
assert_opaque(ui.capture('05b-done-sending'), locked, 'bounty-status-action-reportIssue')

relaunch(ui, drop=FIRST, add=['-uiVerifyBountyStatus', 'open', '-uiVerifyScene', SCENE], ready='bounty-status')
ui.settled(lambda items: by_id(items, 'bounty-status-title'), 'the open bounty never loaded', timeout=45)
ui.settled(lambda items: by_id(items, 'bounty-status-reward'), 'the open bounty never showed its reward')
ui.at_rest()
assert by_id(ui.read(), 'bounty-status-message') is None, 'an open bounty offers 发消息 before anyone is chosen'
ui.capture('06-open-no-entry')
print('PASS: 发消息 alone and beside 确认完成, grey buttons opaque over the address, failed lookup kept the screen, '
      'thread opens in 消息 over the list, none before selection')
