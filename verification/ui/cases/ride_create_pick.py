"""＋ opens 「去哪儿？」 (200 A): two recent routes, then 回住处 / 去学校 / 去商场 / 去机场 and 「都不像，直接写」, each 44 pt and
read with its hint. 去机场 opens the form with 航班和行李 already open and the destination asking 「去哪个机场」; back
returns to the tiles, and a recent route fills both places and the people count on the live ticket."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from ride import open_create, open_list  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/ride-create/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideRecent', 'two']
TILES = ['home', 'campus', 'mall', 'airport']

ui = UI(*sys.argv[1:])
open_list(ui)
assert open_create(ui).get('AXUniqueId') == 'ride-pick', 'with no draft ＋ did not open 去哪儿？'
items = ui.read()
for index, route in enumerate(['Pyramid → YC', '谷中城 → 双威']):
    row = by_id(items, f'ride-pick-recent-{index}')
    assert row and (row.get('AXLabel') or '').startswith(route), f'recent {index}: {row and row.get("AXLabel")}'
    assert_touch_target(row, f'recent route {index}')
for tile in TILES:
    element = by_id(items, f'ride-pick-{tile}')
    name, hint = ui.t(f'ride.create.pick.tile.{tile}.name'), ui.t(f'ride.create.pick.tile.{tile}.hint')
    assert element and element.get('AXLabel') == ui.t('ride.create.pick.tileLabel', name=name, hint=hint), \
        f'{tile}: {element and element.get("AXLabel")}'
    assert_touch_target(element, f'{tile} tile')
assert_touch_target(by_id(items, 'ride-pick-free'), '直接写')
ui.capture('01-pick')

ui.tap('ride-pick-airport')
ui.element('ride-form')
ui.element('ride-form-airport-remove')
dest = ui.element('ride-form-dest')
assert dest.get('AXLabel') == ui.t('ride.create.pick.tile.airport.dest'), dest.get('AXLabel')
ticket = ui.element('ride-form-ticket')
assert ui.t('ride.create.form.liveRoute') in (ticket.get('AXLabel') or ''), ticket.get('AXLabel')
ui.capture('02-form-airport')

ui.tap('BackButton')
ui.element('ride-pick')
ui.tap('ride-pick-recent-0')
ui.element('ride-form')
ui.wait_label('ride-form-ticket', lambda label: 'Pyramid → YC' in label, 'the recent route did not fill the ticket')
start = ui.element('ride-form-start')
assert 'Sunway Pyramid' in (start.get('AXLabel') or ''), start.get('AXLabel')
ui.wait_label('ride-form-seats-label', lambda label: ui.tn('ride.create.form.need', 3) in label,
              'the recent route did not keep 4 people')
ui.capture('03-form-recent')
print('PASS: recent routes, tiles, airport opens the airport group, back keeps the tiles, a route fills the form')
