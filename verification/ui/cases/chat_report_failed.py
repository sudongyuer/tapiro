"""A report that fails (`-uiVerifyChatFail report`): ⋯ → 举报阿杰 (a person, no message), pick 骚扰或威胁, 提交; the sheet stays
with 「没举报成功，请稍后再试」 and the reason still picked, nothing is sent again on its own; 提交 again goes through, and
不屏蔽 on the offer closes the sheet with the composer still there."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import chat_calls, menu_pick, open_menu, open_thread, sheet_action  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/features/block/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyChatFail', 'report']
NAME = '阿杰'


def submit():
    found = ui.wait(lambda items: next((i for i in items if i.get('AXLabel') == ui.t('chat.report.submit')
                                        and i.get('type') == 'Button' and i.get('enabled') is True), None),
                    '提交 is not live')
    f = found['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)


ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', NAME)
ui.at_rest()
open_menu(ui, ui.t('chat.menu.report', name=NAME))
menu_pick(ui, ui.t('chat.menu.report', name=NAME))
ui.element('chat-report', timeout=20)
ui.tap_label(ui.t('chat.report.reason.harassment'))
submit()
ui.element('chat-report-failed', timeout=20)
assert by_id(ui.read(), 'chat-report'), 'the sheet closed after a failed report'
ui.at_rest()
ui.capture('01-failed')
time.sleep(2)  # a replay would follow the failed answer
first = chat_calls(ui, 'report', 2, 0)
assert first == [{'userId': 'fixture-chat-jie', 'messageId': None, 'reason': 'harassment', 'note': None}], first

submit()
ui.labelled(ui.t('chat.report.offerBlock', name=NAME))
assert len(chat_calls(ui, 'report', 2)) == 2, 'the second 提交 did not send'
sheet_action(ui, ui.t('block.confirm.cancel'))
ui.gone('chat-report', timeout=20)
ui.element('chat-composer-input')
ui.at_rest()
ui.capture('02-sent')
print('PASS: a failed report keeps the sheet and the reason, is not replayed, and the retry goes through')
