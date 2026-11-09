"""A failed refresh leaves the rows under the stale note and the list still pages: a failed next page shows
「更早的对话没加载出来」 with 重试 below the rows, and 重试 loads the page. Without the footer on a stale list, the last row looks
like the end of the list."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen  # noqa: E402
from chat import chat_calls, open_list, rows  # noqa: E402
from driver import UI, by_id  # noqa: E402
from gestures import pull  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'src/ui/InlineState.tsx', 'verification/ui/board.py',
        'verification/ui/chat.py', 'verification/ui/gestures.py']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyFixture', 'worst', '-uiVerifyChatFail', 'listRefresh,listMore']
CURSOR = 'fixture-chat-worst-49'

ui = UI(*sys.argv[1:])
open_list(ui)
ui.at_rest()
pull(ui, ui.read())
ui.element('chat-list-stale')
s = screen(ui.read())
for _ in range(30):
    if by_id(ui.state(), 'chat-list-more-failed'):
        break
    ui.swipe((8, s['height'] * 0.8), (8, s['height'] * 0.2), 0.2)
failed = ui.element('chat-list-more-failed', timeout=10)
assert failed.get('AXLabel') == ui.t('chat.list.moreFailed'), failed.get('AXLabel')
assert rows(ui.read()), 'rows vanished when a page failed'
ui.swipe((8, s['height'] * 0.8), (8, s['height'] * 0.2), 0.2)
ui.at_rest()
retry = by_id(ui.read(), 'chat-list-more-retry')['frame']
assert retry['y'] + retry['height'] <= s['height'], f'重试 {retry} is off screen'
ui.capture('01-more-failed')
ui.tap('chat-list-more-retry')
ui.gone('chat-list-more-failed')
again = chat_calls(ui, 'listThreads', 2, where=lambda args: args['before'] == CURSOR)
assert len(again) == 2, f'重试 did not read the page after {CURSOR} again: {again}'
ui.at_rest()
ui.capture('02-retried')
print('PASS: a stale list pages on, with a failed page and 重试 below the rows')
