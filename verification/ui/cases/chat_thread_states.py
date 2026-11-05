"""Thread states: a first load that fails (`-uiVerifyChatFail thread`) shows 「对话没加载出来」 with 重试, and no safety card,
item card or composer, never an empty thread; 重试 loads it. A ride group you left (`-uiVerifyChatLeft 1`) keeps its
messages and shows 「你已离开这个拼车，不能再发消息」 on an opaque bar in place of the composer."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from chat import bubbles, open_list  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyChatFail', 'thread']

ui = UI(*sys.argv[1:])
open_list(ui)
ui.tap('chat-row-fixture-chat-bounty')
failed = ui.element('chat-thread-failed', timeout=45)
assert failed.get('AXLabel') == ui.t('chat.thread.loadFailed'), failed.get('AXLabel')
items = ui.read()
for absent in ('chat-safety', 'chat-composer-input'):
    assert by_id(items, absent) is None, f'{absent} shows on a thread that failed to load'
assert not bubbles(items), 'a failed thread shows messages'
ui.at_rest()
ui.capture('01-failed')
ui.tap('chat-thread-retry')
ui.element('chat-safety', timeout=30)
ui.wait(lambda items: len(bubbles(items)) == 3 and by_id(items, 'chat-composer-input'), '重试 did not load the thread')
ui.capture('02-retried')

relaunch(ui, drop=['-uiVerifyChatFail', 'thread'], add=['-uiVerifyChatLeft', '1'], ready='home-scroll')
open_list(ui)
ui.tap('chat-row-fixture-chat-ride')
left = ui.element('chat-thread-left', timeout=45)
items = ui.wait(lambda items: len(bubbles(items)) == 3 and items, 'the left group lost its messages')
assert by_id(items, 'chat-composer-input') is None, 'a member who left still has the composer'
assert ui.t('chat.thread.left') in [i.get('AXLabel') for i in items], 'no 你已离开 line'
assert left['frame']['y'] + left['frame']['height'] >= items[0]['frame']['height'] - 1, 'the bar is not at the bottom'
ui.at_rest()
ui.capture('03-left')
print('PASS: failed first load with 重试 and no empty thread; a left ride shows 你已离开 in place of the composer')
