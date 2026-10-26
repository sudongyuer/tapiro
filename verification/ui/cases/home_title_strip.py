"""悬赏令 keeps its white halo expanded, collapsed and after a tab switch; the collapsed strip hangs directly under the compact bar."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import (UI, assert_appearance, bottom, by_id, close, dominant, glow, nav_bar,  # noqa: E402
                    reach_home, tab)

DEPS = ['src/features/home/', 'src/features/shell/', 'src/app/(tabs)/_layout.tsx', 'src/app/(tabs)/bounty/']

LOCALES = ['zh-Hans', 'ms']
STRIP_ROW = 44

ARGS = ['-uiVerifySignedIn', 'onboarded']
ui = UI(*sys.argv[1:])
title = ui.t('shell.home.title')


def heading(items):
    return next((i for i in items if i.get('type') == 'Heading' and i.get('AXLabel') == title), None)


def expanded_title():
    return ui.settled(lambda items: (h := heading(items)) and h['frame']['height'] > 30 and h,
                      f'{title} large title never settled')


def collapsed_title():
    return ui.settled(lambda items: (h := heading(items)) and h['frame']['height'] < 30 and by_id(items, 'home-strip') and h,
                      f'{title} compact title and strip never settled')


def assert_halo(shot, f, name):
    background = shot.rgb(f['x'] + f['width'] + 24, f['y'] + f['height'] / 2)
    ink, light = glow(shot, f, background)
    print(f'{name}: background {background}, ink {ink}, halo {light}')
    assert ink > 200, f'{name}: title glyphs missing ({ink} ink pixels)'
    assert light > ink * 0.06, f'{name}: no white halo around the title ({light} light vs {ink} ink pixels)'


def assert_no_halo_on_strip_line(shot):
    strip = by_id(ui.read(), 'home-strip')
    assert strip, 'home-strip disappeared after the collapsed state was captured'
    strip = strip['frame']
    text = {'x': strip['x'] + 52, 'y': strip['y'] + 6, 'width': 220, 'height': strip['height'] - 12}
    background = shot.rgb(strip['x'] + strip['width'] - 6, strip['y'] + strip['height'] / 2)
    ink, light = glow(shot, text, background, pad=0)
    print(f'strip line control: background {background}, ink {ink}, light {light}')
    assert ink > 100 and light < ink * 0.01, f'control failed: plain strip text reads as haloed ({light} vs {ink})'


def assert_strip_under_bar(shot):
    items = ui.read()
    bar, strip = nav_bar(items, ui), by_id(items, 'home-strip')
    assert bar and strip, 'navigation bar or strip missing'
    edge = bottom(bar)
    assert abs(strip['frame']['y'] - edge) <= 1, f'strip row starts at {strip["frame"]["y"]}, compact bar ends at {edge}'
    assert abs(strip['frame']['height'] - STRIP_ROW) <= 1, f'strip row is {strip["frame"]["height"]} tall'
    band = dominant(shot, {'x': 340, 'y': edge + STRIP_ROW - 6, 'width': 40, 'height': 4})
    above = dominant(shot, {'x': 340, 'y': edge - 6, 'width': 40, 'height': 4})
    below = shot.rgb(380, edge + STRIP_ROW + 16)
    assert close(band, above, 3), f'strip colour {band} breaks at the bar edge (bar shows {above})'
    assert max(abs(a - b) for a, b in zip(below, band)) > 20, f'strip does not end {STRIP_ROW} pt under the bar: {band} vs {below}'


reach_home(ui)
f = expanded_title()['frame']
shot = ui.snap('01-expanded')
assert_appearance(shot.path, ui.appearance, 20, 2500, 'screen background below the stage')
assert_halo(shot, f, 'expanded')

ui.swipe((200, 700), (200, 250))
f = collapsed_title()['frame']
shot = ui.snap('02-collapsed')
assert_halo(shot, f, 'collapsed')
assert_no_halo_on_strip_line(shot)
assert_strip_under_bar(shot)

home_tab = ui.t('shell.tabs.bounty')
minimised = ui.wait(lambda items: (t := tab(items, home_tab)) and t['frame']['width'] < 50 and t, 'tab bar did not minimise')
ui.tap_point(minimised['frame']['x'] + 24, minimised['frame']['y'] + 24)
ui.element('tab-me')
ui.tap('tab-me')
ui.element('me-screen')
ui.tap('tab-bounty')
f = collapsed_title()['frame']
shot = ui.snap('03-collapsed-after-tab-switch')
assert_halo(shot, f, 'collapsed after tab switch')
assert_strip_under_bar(shot)

ui.swipe((200, 300), (200, 800))
f = expanded_title()['frame']
shot = ui.snap('04-expanded-after-tab-switch')
assert_halo(shot, f, 'expanded after tab switch')
print('PASS: title halo expanded, collapsed and after a tab switch; strip under the compact bar')
