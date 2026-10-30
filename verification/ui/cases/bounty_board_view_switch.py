"""List / map switch (V2, ruling 8, Q75A, Q80, Q81): beside 能接的悬赏 two stickers 列表 and 地图, each a 44 pt tab read by
VoiceOver with its name, the selected one filled in the accent colour; 地图 hides the cards and the distance axis, keeps
the chips and the chosen place row, and scrolls home so the title sits under the strip; 列表 brings the cards back at the
scroll position they had; the 急 filter and the chosen place survive both switches; without a location the map view
shows 选一个地方 (denied) or the location card (undetermined) in the map's place, with 地图 still selected."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import cards, in_view, ink_box, screen, top_clear, visible  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, assert_touch_target, by_id, reach_home, token  # noqa: E402

DEPS = ['src/features/bounty/', 'src/features/home/', 'src/app/(tabs)/', 'verification/ui/bounty.py',
        'verification/ui/board.py']
BUDGET = 360
SEED = ['-uiVerifyBoardView', 'list']
PLACE_ARGS = ['-uiVerifyBoardPlace', 'sunway']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', *PLACE_ARGS, *SEED]
PLACE = 'Sunway Geo Residences'
ANCHOR = 'bounty-card-fixture-bounty-01'
UNDER_STRIP = 48
KEPT = 3
SELECTED_RATIO = 3
SELECTED_MIN = 400

ui = UI(*sys.argv[1:])


def accent_pixels(shot, element):
    f = element['frame']
    box = {'x': f['x'] - 6, 'y': f['y'] - 6, 'width': f['width'] + 12, 'height': f['height'] + 12}
    found = ink_box(shot, box, token('--color-accent', ui.appearance), 8)
    return found['count'] if found else 0


def assert_selected(name, view):
    items = ui.read()
    shot = ui.snap(name)
    chosen = accent_pixels(shot, by_id(items, f'bounty-view-{view}'))
    other = accent_pixels(shot, by_id(items, f'bounty-view-{"map" if view == "list" else "list"}'))
    assert chosen >= SELECTED_MIN and chosen > SELECTED_RATIO * other, \
        f'{view} is not drawn as the selected sticker: {chosen} accent px against {other}'
    print(f'{name}: {view} selected ({chosen} accent px against {other})')


def place_row():
    return ui.wait_label('bounty-place-row', lambda label: PLACE in label, f'the place row does not name {PLACE}')


def chip(identifier):
    return (ui.element(identifier) or {}).get('AXLabel') or ''


reach_home(ui)
visible(ui, 'bounty-view-map')
items = ui.read()
for view in ('list', 'map'):
    sticker = by_id(items, f'bounty-view-{view}')
    assert sticker, f'no {view} sticker'
    assert sticker.get('AXLabel') == ui.t(f'bounty.board.view.{view}'), sticker.get('AXLabel')
    assert_touch_target(sticker, f'{view} sticker')
title = by_id(items, 'bounty-board-title')
assert title.get('AXLabel') == ui.t('bounty.board.title'), title.get('AXLabel')
for view in ('list', 'map'):
    sticker = by_id(items, f'bounty-view-{view}')
    assert sticker['frame']['x'] > title['frame']['x'], f'the {view} sticker is not beside the title'
ui.at_rest()
assert_selected('01-list', 'list')

anchor_y = visible(ui, ANCHOR)['frame']['y']
items = ui.read()
switch = by_id(items, 'bounty-view-map')
assert switch and in_view(switch, screen(items), top_clear(items)), 'the switch and the first card do not fit on one screen'
title_before = by_id(items, 'bounty-board-title')['frame']['y']
assert title_before > top_clear(items) + UNDER_STRIP, \
    f'the title already sits under the strip ({title_before:.1f} pt), so the scroll home cannot be seen'

ui.tap('bounty-view-map')
title = ui.settled(lambda items: by_id(items, 'bounty-board-title'), 'the title never settled after 地图')
strip = top_clear(ui.read())
assert strip <= title['frame']['y'] <= strip + UNDER_STRIP, \
    f'地图 left the title at {title["frame"]["y"]:.1f} pt, not under the strip at {strip:.1f} pt'
ui.wait(lambda items: not cards(items), 'the list cards stay in map view')
assert by_id(ui.read(), 'bounty-axis') is None, 'the distance axis shows in map view'
place_row()
ui.element('bounty-filter-urgent')
ui.at_rest()
assert_selected('02-map', 'map')

ui.tap('bounty-view-list')
moved = ui.settled(lambda items: by_id(items, ANCHOR), f'{ANCHOR} did not come back with the list')
assert abs(moved['frame']['y'] - anchor_y) <= KEPT, \
    f'the list did not keep its scroll: {ANCHOR} at {moved["frame"]["y"]:.1f} pt, was {anchor_y:.1f} pt'
assert by_id(ui.read(), 'bounty-axis'), 'the distance axis did not come back with the list'
ui.at_rest()
assert_selected('03-list-again', 'list')

visible(ui, 'bounty-filter-urgent')
ui.tap('bounty-filter-urgent')
ui.wait(lambda items: (by_id(items, 'bounty-filter-all') or {}).get('AXLabel') == ui.t('bounty.board.filter.all'),
        '急 did not apply')
visible(ui, 'bounty-view-map')
ui.tap('bounty-view-map')
ui.wait(lambda items: not cards(items), 'the list cards stay in map view')
assert chip('bounty-filter-all') == ui.t('bounty.board.filter.all'), f'the filter was lost: 全部 reads {chip("bounty-filter-all")}'
place_row()
ui.tap('bounty-view-list')
ui.wait(lambda items: cards(items), 'the cards did not come back')
assert chip('bounty-filter-all') == ui.t('bounty.board.filter.all'), f'the filter was lost: 全部 reads {chip("bounty-filter-all")}'
place_row()
ui.capture('04-filter-kept')

relaunch(ui, drop=[*PLACE_ARGS, *SEED],
         add=['-uiVerifyBoardPlace', 'none', '-uiVerifyLocation', 'denied', '-uiVerifyBoardView', 'map'])
row = ui.wait_label('bounty-place-row', lambda label: ui.t('bounty.board.place.pick') in label,
                    'the map view without a location does not offer 选一个地方')
assert_touch_target(row, '选一个地方')
assert not cards(ui.read()), 'cards show in map view without a location'
visible(ui, 'bounty-view-map')
ui.at_rest()
assert_selected('05-denied-map', 'map')

relaunch(ui, drop=[*PLACE_ARGS, *SEED],
         add=['-uiVerifyBoardPlace', 'none', '-uiVerifyLocation', 'undetermined', '-uiVerifyBoardView', 'map'])
visible(ui, 'bounty-location-card')
assert by_id(ui.read(), 'bounty-place-row') is None, 'the place row shows beside the location card'
visible(ui, 'bounty-view-map')
ui.at_rest()
assert_selected('06-undetermined-map', 'map')
print('PASS: two 44 pt stickers, map hides cards and axis and scrolls the title under the strip, list keeps its '
      'scroll, filter and place kept, no-location map views')
