"""Worst case on 消息 (break-ui): a 60-character bounty title and a 56-character name each truncate to one line with the
name and the time still on the row; a 2000-character last line stays one line; 8-character ride shorts read as one route
with 5 人; over 99 unread threads cap the badge at 99+. 120 threads load page by page while scrolling; a failed page
shows 「更早的对话没加载出来」 with 重试 and keeps the rows above, and 重试 continues to the last thread. zh-Hans and ms."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
import ocr  # noqa: E402
from board import screen  # noqa: E402
from chat import open_list, row_label, rows, within_screen  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py', 'src/ui/InlineState.tsx']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 360
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyFixture', 'worst', '-uiVerifyChatFail', 'listMore']
TITLE = '帮我去 Sunway Pyramid LG 层的驿站取一个很重的快递然后送到 Block C 十二楼门口谢谢你，很急！！'
NAME = 'Nurul Aisyah binti Mohd Rahman Abdullah Hj. Kamaruddin'
HEAD = 'chat-row-fixture-chat-worst'
LAST = 'chat-row-fixture-chat-worst-119'
MAX_ROW = 100

ui = UI(*sys.argv[1:])
open_list(ui)
head = ui.element(HEAD)
assert head.get('AXLabel', '').startswith(TITLE), head.get('AXLabel')
assert NAME in head['AXLabel'], head['AXLabel']
items = ui.read()
for element in rows(items):
    within_screen(items, element)
    assert element['frame']['height'] <= MAX_ROW, f'{element["AXUniqueId"]} is {element["frame"]["height"]} pt tall'
ride = by_id(items, 'chat-row-fixture-chat-worst-2')
route = ui.t('chat.list.route', **{'from': '谷中城北庭正门口', 'to': '吉隆坡第二机场站'})
assert row_label(ui, route, ui.t('chat.list.people', count=5),
                 ui.t('chat.list.from', name=NAME, body=f'{NAME} 🚗📦 2'), unread=True).fullmatch(ride['AXLabel']), \
    ride['AXLabel']
ui.at_rest()
shot = ui.snap('01-worst')
read = ocr.lines(shot)
f = head['frame']
assert ocr.find(read, r'Nur', f), 'the other side is pushed off the head row'
assert ocr.find(read, r'\d{2}:\d{2}', f), 'the time is pushed off the head row'
bar = by_id(items, 'tab-messages')['frame']
assert ocr.find(read, r'99\+', {**bar, 'y': bar['y'] - 12, 'height': bar['height'] + 12}), 'the badge does not read 99+'

s = screen(items)


# Flings start in the margin beside the rows, so one that the Simulator delivers as a tap opens nothing.
def fling():
    ui.swipe((8, s['height'] * 0.8), (8, s['height'] * 0.2), 0.2)


for _ in range(30):
    if by_id(ui.state(), 'chat-list-more-failed'):
        break
    fling()
failed = ui.element('chat-list-more-failed', timeout=10)
assert failed.get('AXLabel') == ui.t('chat.list.moreFailed'), failed.get('AXLabel')
assert rows(ui.read()), 'rows vanished when a page failed'
fling()
ui.at_rest()
items = ui.read()
retry = by_id(items, 'chat-list-more-retry')['frame']
assert retry['y'] + retry['height'] <= bar['y'], f'重试 {retry} stays under the tab bar at the end of the list'
ui.capture('02-more-failed')
ui.tap('chat-list-more-retry')
ui.gone('chat-list-more-failed')
for _ in range(40):
    if by_id(ui.state(), LAST):
        break
    fling()
ui.element(LAST, timeout=10)
ui.at_rest()
ui.capture('03-last')
print('PASS: long title and name truncate with the time kept, 99+ badge, paging with a failed page and retry to the end')
