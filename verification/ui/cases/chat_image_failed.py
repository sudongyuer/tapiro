"""A photo whose send fails (120 A states, reused for images): the first send fails (`-uiVerifyChatFail send`), so the
photo bubble stays with its picture and a red ! beside it, and nothing is sent again on its own. Tapping ! asks
「重发该消息？」; 重发 sends it once more under the same client id and the same image path (the upload is idempotent by
that path), and the bubble turns stored with its picture."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, chat_calls, drawn, open_thread, pick_image, tap_button  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyChatFail', 'send', '-uiVerifyChatPick', 'wide']


def retries(items):
    return [i for i in items if (i.get('AXUniqueId') or '').startswith('chat-retry-')]


ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', '阿杰')
pick_image(ui, 'chat.thread.photo')
mine = ui.t('chat.list.mine', body=ui.t('chat.thread.image'))
failed = ui.t('chat.thread.a11yFailed', label=mine)
items = ui.wait(lambda items: retries(items) and any(b.get('AXLabel') == failed for b in bubbles(items)) and items,
                'the failed photo shows no red !', 20)
bubble = next(b for b in bubbles(items) if b.get('AXLabel') == failed)
f = bubble['frame']
assert abs(f['width'] / f['height'] - 3) < 0.1, f'a 2048×400 photo is not cropped to 3:1: {f}'
ui.at_rest()
shot = ui.snap('01-failed')
drawn(shot, f)
key = bubble['AXUniqueId'][len('chat-bubble-'):]
time.sleep(2)  # a replay would follow the failed answer
# Filtered by this message's client id: the preferences file can still hold the previous launch's calls.
sent = [call for call in chat_calls(ui, 'send', 1) if call['clientId'] == key]
assert len(sent) == 1, f'a failed photo was sent again on its own: {chat_calls(ui, "send", 1)}'

[retry] = retries(ui.read())
ui.tap(retry['AXUniqueId'])
ui.labelled(ui.t('chat.thread.resendTitle'))
tap_button(ui, ui.t('chat.thread.resend'))
ui.wait(lambda items: not retries(items) and any(b.get('AXLabel') == mine for b in bubbles(items)),
        'the resent photo never turned stored', 20)
ui.wait(lambda items: len([c for c in chat_calls(ui, 'send', 2, 0) if c['clientId'] == key]) == 2,
        'the retry never reached the service', 10)
first, second = [call for call in chat_calls(ui, 'send', 2) if call['clientId'] == key]
assert first['clientId'] == second['clientId'] and first['image'] == second['image'] and first['image'], \
    f'the retry changed the message or its image path: {first} {second}'
ui.at_rest()
stored = next(b for b in bubbles(ui.read()) if b.get('AXLabel') == mine)
drawn(ui.snap('02-resent'), stored['frame'])
print('PASS: a failed photo keeps its picture and red !, no automatic resend, 重发 reuses client id and path')
