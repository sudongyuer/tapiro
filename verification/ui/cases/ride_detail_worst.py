"""break-ui for the detail and 集合 (break-ui): the organiser of a 6-seat ride at 集合 with five 40-character names,
8-character short names, 80-character place labels, an 80-character meeting note, a long plate, RM 1,000 and an
80-character application note. The ticket, the arrival row (two rows of avatars), the application card and the bottom
bar stay inside the screen; every avatar keeps its label."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from ride import within_screen  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'worst',
        '-uiVerifyFixture', 'worst']
RIDERS = 6

ui = UI(*sys.argv[1:])
ui.element('ride-detail-ticket')
items = ui.read()
for identifier in ('ride-detail-ticket', 'ride-detail-depart', 'ride-detail-request-name-fixture-ride-long-request'):
    assert by_id(items, identifier), f'{identifier} is missing'
    within_screen(items, identifier)
ui.capture('01-top')
f = ui.element('ride-detail')['frame']
for _ in range(4):
    ui.swipe((f['x'] + f['width'] / 2, f['y'] + f['height'] * 0.7), (f['x'] + f['width'] / 2, f['y'] + f['height'] * 0.3))
items = ui.read()
avatars = [i for i in items if (i.get('AXUniqueId') or '').startswith('ride-detail-arrival-')]
assert len(avatars) == RIDERS, f'{len(avatars)} avatars, expected {RIDERS}'
assert len({round(a['frame']['y']) for a in avatars}) >= 2, 'six riders did not wrap onto two rows'
for avatar in avatars:
    assert avatar.get('AXLabel'), f'{avatar.get("AXUniqueId")} lost its label'
    within_screen(items, avatar['AXUniqueId'])
ui.at_rest()
ui.capture('02-arrivals')
print('PASS: worst ride stays inside the screen; six riders wrap and keep their labels')
