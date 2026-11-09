"""A reload of 120 shown threads asks for 100, so the list shrinks with the new last row in reach of the end, and the next
page is asked for again: FlatList sends onEndReached for the new content length. A signal 120 s after launch reloads
while the last thread is on screen."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen  # noqa: E402
from chat import chat_calls, open_list, rows  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'src/lib/live/', 'verification/ui/board.py', 'verification/ui/chat.py']
BUDGET = 360
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyFixture', 'worst', '-uiVerifyLive', '120000:chat.message:x']
LAST = 'chat-row-fixture-chat-worst-119'

ui = UI(*sys.argv[1:])
open_list(ui)
s = screen(ui.read())
for _ in range(60):
    if by_id(ui.state(), LAST):
        ui.at_rest()
        last = by_id(ui.read(), LAST)
        if 0 <= last['frame']['y'] < s['height']:
            break
    ui.swipe((8, s['height'] * 0.8), (8, s['height'] * 0.2), 0.2)
else:
    raise AssertionError('the last thread never came on screen')
calls = chat_calls(ui, 'listThreads', 3)
is_head = lambda args: args['before'] is None  # noqa: E731
assert len([c for c in calls if is_head(c)]) == 1, f'the signal came before the end of the list: {calls}'
cursor = [c for c in calls if not is_head(c)][-1]['before']
assert len([c for c in calls if c['before'] == cursor]) == 1, f'asked twice before the reload: {calls}'
ui.capture('01-end')
print(f'all 120 shown; last cursor {cursor}')
deadline = time.monotonic() + 150
while time.monotonic() < deadline:
    calls = chat_calls(ui, 'listThreads', 4, timeout=1)
    if len([c for c in calls if is_head(c)]) == 2:
        break
head = [c for c in calls if is_head(c)]
assert len(head) == 2 and head[1]['count'] == 100, f'no reload for 100 rows: {calls}'
end = time.monotonic() + 15
asked = 0
while time.monotonic() < end and asked < 2:
    calls = chat_calls(ui, 'listThreads', 5, timeout=1)
    asked = len([c for c in calls if c['before'] == cursor])
ui.at_rest()
ui.capture('02-after-the-reload')
print(f'on screen after: {[r.get("AXUniqueId") for r in rows(ui.read())][-3:]}; calls {calls}')
assert asked == 2, f'stalled: the next page after {cursor} was not asked for again: {calls}'
ui.wait(lambda items: by_id(items, LAST) is not None, 'the threads after the 100th did not come back')
print('PASS: the next page is asked for again after the list shrinks')
