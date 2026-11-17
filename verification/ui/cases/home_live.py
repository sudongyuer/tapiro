"""With a ride and an in-progress bounty and nothing to pay, home shows the live stage with the ride card in front of a two-card stack;
the ride card offers no button of its own (the inert 我到了 is gone until a live ride feeds home)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_home, by_id  # noqa: E402

DEPS = ['src/features/home/', 'src/features/shell/', 'src/app/(tabs)/_layout.tsx', 'src/app/(tabs)/bounty/']

LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyShellFeed', 'rideSoon,bountyInProgress', '-uiVerifySignedIn', 'onboarded']

ui = UI(*sys.argv[1:])
items = assert_home(ui, 'live', 'live', ['rideSoon', 'bountyInProgress'])
card = by_id(items, 'live-card-rideSoon')['frame']


def inside(f):
    return card['x'] <= f['x'] and f['x'] + f['width'] <= card['x'] + card['width'] and \
        card['y'] <= f['y'] and f['y'] + f['height'] <= card['y'] + card['height']


buttons = [i.get('AXLabel') for i in items if i.get('type') == 'Button' and inside(i['frame'])
           and i.get('AXUniqueId') not in ('live-card-rideSoon', 'live-cards-toggle', 'live-card-peek-1')]
assert not buttons, f'the ride card draws buttons {buttons}'
print('PASS: live stage, ride card in front with no button of its own, two-card stack')
