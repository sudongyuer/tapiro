"""Long-press menu (121 A, the system context menu): holding 阿杰's message lifts it with 复制 and 举报, 举报 in its own
last group and no 翻译 (hidden until step 8) and no unsend; your own message offers only 复制. 举报 asks 「举报这条消息？」,
and confirming sends the report for that message and person and answers 「收到了，我们会看」."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, chat_calls, open_thread, tap_button  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1']
PEER = 'chat-bubble-fixture-chat-bounty-m3'
MINE = 'chat-bubble-fixture-chat-bounty-c2'


def menu(ui, identifier):
    ui.press(identifier, 1.2)
    return ui.labelled(ui.t('chat.thread.copy'))



ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', '阿杰')
ui.wait(lambda items: len(bubbles(items)) == 3, 'the demo thread never showed its messages')
ui.at_rest()

copy = menu(ui, PEER)
items = ui.read()
labels = [i.get('AXLabel') for i in items]
assert ui.t('chat.thread.report') in labels, f'no 举报 for a message from the other side: {labels}'
report = next(i for i in items if i.get('AXLabel') == ui.t('chat.thread.report'))
assert report['frame']['y'] > copy['frame']['y'], '举报 is not after 复制'
ui.capture('01-peer-menu')
ui.tap_label(ui.t('chat.thread.report'))
ui.labelled(ui.t('chat.thread.reportTitle'))
ui.capture('02-report-confirm')
tap_button(ui, ui.t('chat.thread.report'))
ui.labelled(ui.t('chat.thread.reported'))
assert chat_calls(ui, 'report', 1) == [{'userId': 'fixture-chat-jie', 'messageId': 'fixture-chat-bounty-m3', 'reason': None,
                        'note': None}], chat_calls(ui, 'report', 1)
tap_button(ui, ui.t('chat.thread.ok'))
ui.wait(lambda items: ui.t('chat.thread.reported') not in [i.get('AXLabel') for i in items], 'the ack stayed')

menu(ui, MINE)
labels = [i.get('AXLabel') for i in ui.read()]
assert ui.t('chat.thread.report') not in labels, 'your own message offers 举报'
ui.capture('03-own-menu')
ui.tap_label(ui.t('chat.thread.copy'))
ui.wait(lambda items: ui.t('chat.thread.copy') not in [i.get('AXLabel') for i in items], 'the menu stayed open')
print('PASS: peer menu 复制 and 举报 (confirm, report sent, ack); own menu only 复制')
