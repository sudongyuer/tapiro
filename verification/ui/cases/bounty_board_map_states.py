"""Map view states (Debug scene `bounty-map`, the production BoardMapBody; the board switch lands in Task 5): with
location denied and no place there is no map and no pin, only 选一个地方, which asks for a place; a chosen place shows
the place row, the map with its 「这里」 marker and the pins; a first-load failure shows 没加载出来 in the map's place,
never a map or a count, and 重试 brings the pins; an empty 急 filter keeps the map with no pins under 看全部; on the home
board in map view a failed pull keeps the pins under the stale notice above the map; in the Debug scene the refresh
spinner ends after an instant failure (the chips return to rest); a failed next page turns the more chip into 后面的没加载出来 · 重试, which
recovers."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, assert_touch_target, by_id, close  # noqa: E402
from map import CARD_FILL, MAP, map_at_rest, open_scene, pin_id, pins  # noqa: E402

DEPS = ['src/features/bounty/map/', 'src/features/bounty/board/', 'src/debug/BoardMapScene.tsx', 'src/features/home/',
        'src/app/(tabs)/', 'verification/ui/bounty.py',
        'modules/tapiro-kit/ios/BountyMapView.swift', 'verification/ui/map.py']
SCENE = 'bounty-map'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 420
NO_ORIGIN = ['-uiVerifyBoardPlace', 'none', '-uiVerifyLocation', 'denied']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBoardPlace', 'none', '-uiVerifyLocation', 'denied']
ME = ['-uiVerifyBoardPlace', 'none']
FIRST = 'fixture-bounty-01'
ONE = 'fixture-bounty-04'
PAGE = 20
PULL = (0.25, 0.85)
HOME_MAP = ['-uiVerifyShellFeed', 'none', '-uiVerifyBoardView', 'map']

ui = UI(*sys.argv[1:])


def chip(identifier):
    return (ui.element(identifier) or {}).get('AXLabel') or ''


def assert_no_map(items, why):
    assert by_id(items, MAP) is None, f'{why}: a map is shown'
    assert not pins(items), f'{why}: pins are shown: {[p["AXUniqueId"] for p in pins(items)]}'


def assert_inline_fill(shot, element, name):
    f = element['frame']
    found = shot.rgb(f['x'] - 6, f['y'] + f['height'] / 2)
    assert close(found, CARD_FILL[ui.appearance]), f'{name}: card fill is {found}'


ui.element('ui-verify-ready')
row = ui.wait_label('bounty-place-row', lambda label: ui.t('bounty.board.place.pick') in label,
                    'no 选一个地方 row without a location or place')
map_at_rest(ui)
assert_no_map(ui.read(), 'no origin')
ui.capture('01-no-origin')
ui.tap('bounty-place-row')
ui.element('bounty-map-scene-pick-place')

open_scene(ui, '-uiVerifyBoardPlace', 'sunway', '-uiVerifyLocation', 'denied', drop=NO_ORIGIN, ready=pin_id(FIRST))
near = ui.t('bounty.board.place.near', place='Sunway Geo Residences')
ui.wait_label('bounty-place-row', lambda label: near in label, f'the place row does not read {near!r}')
here = ui.labelled(ui.t('bounty.board.axis.here'))
assert here['frame']['width'] > 0, '「这里」 marker has no frame'
map_at_rest(ui)
ui.capture('02-chosen-place')

open_scene(ui, *ME, '-uiVerifyBoardFail', 'first', drop=NO_ORIGIN, ready='bounty-board-failed')
failed = ui.element('bounty-board-failed')
assert failed.get('AXLabel') == ui.t('bounty.board.state.failed'), failed.get('AXLabel')
items = ui.read()
assert_no_map(items, 'first-load failure')
assert by_id(items, 'bounty-board-empty') is None, 'a failed load is shown as empty'
assert chip('bounty-filter-all') == ui.t('bounty.board.filter.all'), chip('bounty-filter-all')
assert_inline_fill(ui.snap('03-failed'), failed, 'failed card')
ui.tap('bounty-board-retry')
ui.element(pin_id(FIRST))
ui.gone('bounty-board-failed')
ui.capture('04-retried')

open_scene(ui, *ME, '-uiVerifyBoard', 'one', drop=NO_ORIGIN, ready=pin_id(ONE))
ui.tap('bounty-filter-urgent')
ui.wait_label('bounty-board-filter-empty', lambda label: label == ui.t('bounty.board.state.emptyUrgent'),
              'the empty 急 filter shows no inline card')
ui.gone(pin_id(ONE))
items = ui.read()
assert by_id(items, MAP), 'the empty filter removed the map'
assert not pins(items), 'pins are shown under an empty filter'
empty = ui.element('bounty-board-filter-empty')
assert empty['frame']['y'] + empty['frame']['height'] <= by_id(items, MAP)['frame']['y'] + 1, \
    'the empty card is not above the map'
map_at_rest(ui)
ui.capture('05-filter-empty')
ui.tap('bounty-board-show-all')
ui.element(pin_id(ONE))
ui.gone('bounty-board-filter-empty')

relaunch(ui, drop=NO_ORIGIN, add=[*ME, *HOME_MAP, '-uiVerifyBoardFail', 'refresh'], ready=pin_id(FIRST))
map_at_rest(ui)
items = ui.read()
assert by_id(items, 'bounty-board-stale') is None, 'the stale notice shows before any pull'
s = items[0]['frame']
ui.swipe((s['width'] / 2, s['height'] * PULL[0]), (s['width'] / 2, s['height'] * PULL[1]), 0.6)
stale_text = re.compile(ui.pattern('bounty.board.state.stale', time=r'\d{2}:\d{2}'))
ui.wait_label('bounty-board-stale', lambda label: bool(stale_text.fullmatch(label)),
              'a failed refresh shows no stale notice with a time')
items = ui.read()
assert by_id(items, pin_id(FIRST)), 'pins vanished after a failed refresh'
assert by_id(items, 'bounty-board-failed') is None, 'a failed refresh replaced the map with the failed card'
stale = by_id(items, 'bounty-board-stale')['frame']
assert stale['y'] + stale['height'] <= by_id(items, MAP)['frame']['y'] + 1, 'the stale notice is not above the map'
map_at_rest(ui)
ui.capture('06-stale')
ui.tap('bounty-board-retry')
ui.gone('bounty-board-stale')

open_scene(ui, *ME, '-uiVerifyBoard', 'long', '-uiVerifyBoardFail', 'page', drop=NO_ORIGIN,
           ready='bounty-map-more')
ui.tap('bounty-map-more')
failed = ui.wait_label('bounty-map-more-failed',
                       lambda label: ui.t('bounty.board.state.pageFailed') in label
                       and ui.t('bounty.board.state.retry') in label,
                       'a failed page shows no retry chip')
assert_touch_target(failed, 'the failed page chip')
ui.capture('07-page-failed')
ui.tap('bounty-map-more-failed')
ui.wait_label('bounty-map-more', lambda label: label == ui.t('bounty.board.map.more', shown=2 * PAGE, total=45,
                                                             count=5),
              'retrying the page did not load it')
ui.capture('08-page-retried')
open_scene(ui, *ME, '-uiVerifyBoardFail', 'refresh', drop=NO_ORIGIN, ready=pin_id(FIRST))
map_at_rest(ui)
rest_y = ui.element('bounty-filter-all')['frame']['y']
s = ui.read()[0]['frame']
ui.swipe((s['width'] / 2, s['height'] * PULL[0]), (s['width'] / 2, s['height'] * PULL[1]), 0.6)
ui.wait(lambda items: by_id(items, 'bounty-filter-all')
        and abs(by_id(items, 'bounty-filter-all')['frame']['y'] - rest_y) <= 2,
        'the refresh spinner did not end after an instant failure: the chips stay pulled down', timeout=8)
ui.capture('09-scene-refresh-ended')
print('PASS: no origin, chosen place with 这里, first-load failure and retry, empty filter over the map, stale, '
      'failed page, and the scene spinner ends after an instant failure')
