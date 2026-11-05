"""A long thread (the Task 0 spike, now the real screen): 44 messages open at the newest one, just above the composer,
with the safety card above the oldest, out of view; a reply that arrives while the end is in view (a live chat.message
25 s after launch, the fixture's 20 s reply) appears at the bottom without a manual scroll."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
SCENE = 'chat-thread'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1', '-uiVerifyChatLong', '1',
        '-uiVerifyLive', '25000:chat.message:fixture-chat-long']
REPLY = '箱子放你门口了'


def visible_end(items, label):
    composer = by_id(items, 'chat-composer-input')
    shown = [b for b in bubbles(items) if b['frame']['y'] + b['frame']['height'] <= composer['frame']['y'] + 1
             and b['frame']['y'] >= 0]
    return shown and label in (shown[-1].get('AXLabel') or '') and shown[-1]


ui = UI(*sys.argv[1:])
ui.element('chat-composer-input', timeout=60)
items = ui.wait(lambda items: visible_end(items, '') and items, 'the long thread never placed its messages')
ui.at_rest()
items = ui.read()
newest = bubbles(items)[-1]
composer = by_id(items, 'chat-composer-input')
assert newest['frame']['y'] + newest['frame']['height'] <= composer['frame']['y'] + 1, 'the newest is under the composer'
assert composer['frame']['y'] - (newest['frame']['y'] + newest['frame']['height']) < 60, 'it did not open at the end'
safety = by_id(items, 'chat-safety')
assert safety is None or safety['frame']['y'] + safety['frame']['height'] < 0, 'the safety card is in view at the end'
ui.capture('01-opened-at-end')
ui.wait(lambda items: visible_end(items, REPLY), 'the live reply did not appear at the bottom', 45)
ui.at_rest()
ui.capture('02-reply-arrived')
print('PASS: opens at the newest message; a live reply lands at the bottom')
