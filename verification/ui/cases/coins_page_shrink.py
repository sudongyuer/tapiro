"""A head read that shrinks the history leaves the first page's last row on screen, with no page out, and the next page is
still asked for: that row's appear handler fires again. The worst history has 129 rows over pages of 50; a signal 90 s after
launch reads the first page again while page two is on screen. Without the second firing this fails (shown with a handler
that fires once per row, 2026-11-09)."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import coin_calls, open_page, row_ids  # noqa: E402
from driver import UI, by_id  # noqa: E402
from gestures import drag  # noqa: E402

DEPS = ['src/features/coins/', 'src/debug/CoinsScenes.tsx', 'src/lib/live/', 'src/lib/loadable.ts', 'verification/ui/coins.py', 'verification/ui/gestures.py']
SCENE = 'coins-page'
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'worst',
        '-uiVerifyLive', '90000:payment.settled:x']

ui = UI(*sys.argv[1:])
open_page(ui)
is_page = lambda args: args['before'] is not None  # noqa: E731
is_head = lambda args: args['before'] is None  # noqa: E731
items = ui.read()
w, h = items[0]['frame']['width'], items[0]['frame']['height']
for _ in range(20):
    if coin_calls(ui, 'history', 1, timeout=0, where=is_page):
        break
    drag(ui, (w / 2, h * 0.8), (w / 2, h * 0.2))
cursor = coin_calls(ui, 'history', 1, where=is_page)[0]['before']
target = f'coins-row-{cursor}'
print(f'cursor {cursor}')

for _ in range(8):
    ui.at_rest()
    items = ui.read()
    row = by_id(items, target)
    if row is not None and h * 0.3 <= row['frame']['y'] <= h * 0.6:
        break
    if row is not None:
        drag(ui, (w / 2, h * 0.5), (w / 2, max(h * 0.2, min(h * 0.85, h * 0.95 - row['frame']['y']))))
    else:
        # ids fall down the list: every row on screen newer than the cursor means it is further down
        down = min(row_ids(items)) > cursor
        drag(ui, (w / 2, h * (0.7 if down else 0.3)), (w / 2, h * (0.3 if down else 0.7)))
ui.at_rest()
items = ui.read()
row = by_id(items, target)
assert row is not None and 0 <= row['frame']['y'] <= h * 0.8, f'row {cursor} is not on screen: {row_ids(items)}'
assert len(coin_calls(ui, 'history', 2, timeout=0, where=is_head)) == 1, 'the signal came before the row was placed'
ids = row_ids(items)
assert any(i < cursor for i in ids), f'no row after {cursor} on screen: {ids}'
assert len(coin_calls(ui, 'history', 2, timeout=0, where=lambda args: args['before'] == cursor)) == 1, 'asked twice before the read'
ui.capture('01-page-two-on-screen')
print(f'on screen before the read: {ids}')
assert len(coin_calls(ui, 'history', 2, timeout=120, where=is_head)) == 2, 'the head read never came'
asked = len(coin_calls(ui, 'history', 2, timeout=0, where=lambda args: args['before'] == cursor))
print(f'asked for cursor {cursor}: {asked} right after the head read')
end = time.monotonic() + 15
while time.monotonic() < end and asked < 2:
    asked = len(coin_calls(ui, 'history', 2, timeout=1, where=lambda args: args['before'] == cursor))
ui.capture('02-after-the-read')
print(f'after: on screen {row_ids(ui.read())}')
assert asked == 2, f'stalled: the next page after {cursor} was not asked for again'
ui.wait(lambda items: any(i < cursor for i in row_ids(items)), f'no row after {cursor} came back')
print('PASS: the next page is asked for again after the shrink')
