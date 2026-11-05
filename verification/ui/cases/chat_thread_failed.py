"""A failed send (120 A): the first send fails (`-uiVerifyChatFail send`), so the bubble keeps its text with a red ! beside
it and reads 没发出去; nothing is sent again on its own. Tapping ! asks 「重发该消息？」 with 重发, 删除 and 取消; 重发 sends it
once more under the same client id and the bubble turns plain. Dark adds the bubble colours."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, chat_calls, open_thread, tap_button  # noqa: E402
from driver import UI, assert_colour, by_id, token  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
DRAFT = '在大堂等你'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyChatFail', 'send', '-uiVerifyChatDraft', 'fixture-chat-bounty|在大堂等你']


def retries(items):
    return [i for i in items if (i.get('AXUniqueId') or '').startswith('chat-retry-')]



ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', '阿杰')
ui.wait(lambda items: (by_id(items, 'chat-composer-input') or {}).get('AXValue') == DRAFT, 'no kept draft')
ui.tap('chat-composer-send')
mine = ui.t('chat.list.mine', body=DRAFT)
failed = ui.t('chat.thread.a11yFailed', label=mine)
items = ui.wait(lambda items: retries(items) and any(b.get('AXLabel') == failed for b in bubbles(items)) and items,
                'the failed bubble shows no red !')
[retry] = retries(items)
assert retry.get('AXLabel') == ui.t('chat.thread.failed'), retry.get('AXLabel')
bubble = next(b for b in bubbles(items) if b.get('AXLabel') == failed)
assert retry['frame']['x'] + retry['frame']['width'] <= bubble['frame']['x'] + 1, 'the ! is not beside the bubble'
ui.at_rest()
shot = ui.snap('01-failed')
assert_colour(shot, bubble['frame'], token('--color-accent', ui.appearance), 'your bubble')
peer = next(b for b in bubbles(items) if b['AXUniqueId'] == 'chat-bubble-fixture-chat-bounty-m3')
theirs = shot.rgb(peer['frame']['x'] + 6, peer['frame']['y'] + peer['frame']['height'] / 2)
ground = shot.rgb(2, peer['frame']['y'] + peer['frame']['height'] / 2)
assert max(abs(a - b) for a, b in zip(theirs, ground)) >= 12, f'their bubble {theirs} melts into the ground {ground}'
urgent = shot.count(retry['frame'], lambda rgb: abs(rgb[0] - token('--color-urgent', ui.appearance)[0]) < 30
                    and rgb[1] < 140)
assert urgent > 40, f'the ! is not drawn in the urgent colour ({urgent} pixels)'
assert chat_calls(ui, 'send', 1), 'the first send never reached the call log'
time.sleep(2)  # a replay would follow the failed answer
assert len(chat_calls(ui, 'send', 2, 0)) == 1, 'a failed message was sent again on its own'

ui.tap(retry['AXUniqueId'])
ui.labelled(ui.t('chat.thread.resendTitle'))
for label in ('chat.thread.resend', 'chat.thread.discard', 'chat.thread.cancel'):
    ui.labelled(ui.t(label))
ui.capture('02-resend')
tap_button(ui, ui.t('chat.thread.resend'))
ui.wait(lambda items: not retries(items) and any(b.get('AXLabel') == mine for b in bubbles(items)),
        'the resent message never turned stored')
first, second = chat_calls(ui, 'send', 2)
assert first['clientId'] == second['clientId'], f'the retry used another client id: {first} {second}'
ui.at_rest()
ui.capture('03-resent')
print('PASS: red ! on failure, no automatic resend, 重发 sends once more with the same client id')
