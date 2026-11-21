"""While the front card of a three-card stack is held down, it dims into its own colour: neither the calm card stacked
behind it nor the board under it shows through (owner device screenshot, 2026-11-21)."""
import sys
import threading
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_colour, by_id, reach_home, token  # noqa: E402

DEPS = ['src/features/home/', 'src/ui/PressDim.tsx', 'src/ui/LiveCard.tsx']
ARGS = ['-uiVerifyShellFeed', 'bountyAction,bountyWaiting,bountyInProgress', '-uiVerifySignedIn', 'onboarded']
HOLD_S = 3

ui = UI(*sys.argv[1:])
reach_home(ui)
f = ui.settled(lambda items: by_id(items, 'live-card-bountyAction'), 'front card missing')['frame']
assert by_id(ui.read(), 'live-card-peek-1'), 'no card stacked behind the front card'
surface = token('--color-card-progress', ui.appearance)
outside_behind = {'x': f['x'] + 2, 'y': f['y'] + f['height'] * 0.35, 'width': 4, 'height': f['height'] * 0.3}
over_behind = {'x': f['x'] + 12, 'y': f['y'] + f['height'] * 0.35, 'width': 5, 'height': f['height'] * 0.3}

held = threading.Thread(target=ui.press_at, args=(f, HOLD_S))
held.start()
time.sleep(1)
shot = ui.snap('01-held')
held.join()
assert_colour(shot, outside_behind, surface, 'held front card over the board')
assert_colour(shot, over_behind, surface, 'held front card over the card behind')
print('PASS: a held front card stays opaque')
