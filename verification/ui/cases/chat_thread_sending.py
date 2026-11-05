"""Delivery states (120 A, drawn as the WeChat style on the canvas): a draft kept on the device is in the composer when
the thread opens; 发送 empties the composer at once and the new bubble shows a spinner beside it, without dimming,
while the send is outstanding (the fixture holds it for 6 s); once the server stores it the spinner goes and the
bubble reads plain. The draft does not come back after sending."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, open_thread  # noqa: E402
from driver import UI, assert_colour, by_id, token  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
DRAFT = '我在大堂等你'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyChatSendDelay', '6000', '-uiVerifyChatDraft', 'fixture-chat-bounty|我在大堂等你']


def spinners(items):
    return [i for i in items if (i.get('AXUniqueId') or '').startswith('chat-sending-')]


ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', '阿杰')
ui.wait(lambda items: (by_id(items, 'chat-composer-input') or {}).get('AXValue') == DRAFT,
        'the kept draft is not in the composer')
ui.tap('chat-composer-send')
mine = ui.t('chat.list.mine', body=DRAFT)
sending = ui.t('chat.thread.a11ySending', label=mine)
ui.wait(lambda items: any(b.get('AXLabel') == sending for b in bubbles(items)) and spinners(items),
        'the sent bubble shows no spinner while sending')
items = ui.read()
assert not (by_id(items, 'chat-composer-input') or {}).get('AXValue'), 'the composer kept the sent text'
assert not by_id(items, 'chat-composer-send'), '发送 stays while the composer is empty'
shot = ui.snap('01-sending')
bubble = next(b for b in bubbles(items) if b.get('AXLabel') == sending)
assert_colour(shot, bubble['frame'], token('--color-accent', ui.appearance), 'the sending bubble (not dimmed)')
[spinner] = spinners(items)
ground = shot.rgb(2, spinner['frame']['y'] + spinner['frame']['height'] / 2)
drawn = shot.count(spinner['frame'], lambda rgb: max(abs(a - b) for a, b in zip(rgb, ground)) > 40)
assert drawn > 10, f'the spinner is not drawn ({drawn} pixels)'
assert spinner['frame']['x'] + spinner['frame']['width'] <= bubble['frame']['x'] + 1, 'the spinner is not beside it'
ui.wait(lambda items: any(b.get('AXLabel') == mine for b in bubbles(items)) and not spinners(items),
        'the bubble never turned stored', 20)
ui.at_rest()
ui.capture('02-stored')
assert not by_id(ui.read(), 'chat-composer-send'), 'the draft came back after sending'
print('PASS: kept draft, spinner while sending, plain once stored, draft cleared')
