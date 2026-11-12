"""Long-press menu (121 A, the system context menu): holding 阿杰's message lifts it with 复制, 翻译 (141, covered by
chat_translate) and 举报, 举报 in its own last group, and no unsend; your own message offers only 复制. 举报 opens the 举报 sheet
(122 A, covered by chat_report_message); 取消 closes it without sending anything."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, chat_calls, open_thread  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/features/chat/', 'src/features/block/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
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
ui.element('chat-report', timeout=20)
ui.capture('02-report-sheet')
ui.tap_label(ui.t('chat.report.cancel'))
ui.gone('chat-report', timeout=20)
assert chat_calls(ui, 'report', 1, 2) == [], 'cancelling the sheet sent a report'
ui.at_rest()

menu(ui, MINE)
labels = [i.get('AXLabel') for i in ui.read()]
assert ui.t('chat.thread.report') not in labels, 'your own message offers 举报'
ui.capture('03-own-menu')
ui.tap_label(ui.t('chat.thread.copy'))
ui.wait(lambda items: ui.t('chat.thread.copy') not in [i.get('AXLabel') for i in items], 'the menu stayed open')
print('PASS: peer menu 复制 and 举报 (opens the sheet, 取消 sends nothing); own menu only 复制')
