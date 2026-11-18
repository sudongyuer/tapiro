"""Thread states: a first load that fails (`-uiVerifyChatFail thread`) shows 「对话没加载出来」 with 重试, and no safety card,
item card or composer, never an empty thread, on a card that stands out from the thread's ground; 重试 loads it. A ride group you left (`-uiVerifyChatLeft 1`) keeps its
messages and shows 「你已离开这个拼车，不能再发消息」 on an opaque bar in place of the composer. VoiceOver names the
composer 「写消息」 ahead of its placeholder instead of reading the placeholder twice."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from chat import bubbles, open_list  # noqa: E402
from driver import UI, by_id  # noqa: E402

CARD_PADDING = 16

DEPS = ['src/features/chat/', 'src/ui/InlineState.tsx', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
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
shot = ui.snap('01-failed')
middle = failed['frame']['y'] + failed['frame']['height'] / 2
fill, ground = shot.rgb(failed['frame']['x'] - CARD_PADDING / 2, middle), shot.rgb(2, middle)
assert max(abs(a - b) for a, b in zip(fill, ground)) >= 8, f'the failed card {fill} melts into the ground {ground}'
ui.tap('chat-thread-retry')
ui.element('chat-safety', timeout=30)
items = ui.wait(lambda items: len(bubbles(items)) == 3 and by_id(items, 'chat-composer-input') and items,
                '重试 did not load the thread')
spoken = by_id(items, 'chat-composer-input').get('AXLabel') or ''
placeholder = ui.t('chat.thread.placeholder')
assert spoken.startswith(ui.t('chat.thread.composerLabel')) and spoken.count(placeholder) <= 1, \
    f'the composer reads {spoken!r}, not its name ahead of the placeholder'
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
