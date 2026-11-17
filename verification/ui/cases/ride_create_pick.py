"""＋ opens 「去哪儿？」 (200 A): two recent routes, then 回住处 / 去学校 / 去商场 / 去机场 and 「都不像，直接写」, each 44 pt and
read with its hint. 去机场 opens the form with 航班和行李 already open and the destination asking 「去哪个机场」; back
returns to the tiles, and a recent route fills both places and the people count on the live ticket."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
import ocr  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from ride import form_scroll_to, open_create, open_list  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/ride-create/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py',
        'verification/ui/ocr.py', 'src/ui/FieldRow.tsx']
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
dest = ui.element('ride-form-dest')
assert dest.get('AXLabel') == ui.t('ride.create.pick.tile.airport.dest'), dest.get('AXLabel')
form_scroll_to(ui, 'ride-form-airport-remove')
ticket = ui.element('ride-form-ticket')
assert ui.t('ride.create.form.liveRoute') in (ticket.get('AXLabel') or ''), ticket.get('AXLabel')
ui.at_rest()
shot = ui.snap('02-form-airport')
if ui.locale == 'zh-Hans':
    read = ocr.lines_in(shot, ui.locale)
    form = ui.element('ride-form')['frame']
    edges = [ocr.find(read, re.escape(ui.t(f'ride.create.form.{key}')), form) for key in ('airport', 'flightAdd')]
    assert all(edges), f'航班和行李 and 加起飞时间 are not both readable: {[line["text"] for line in read]}'
    drift = abs(edges[0][0]['x'] - edges[1][0]['x'])
    assert drift <= 3, f'the icon rows of 加点细节 start their labels {drift:.0f} pt apart'

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
