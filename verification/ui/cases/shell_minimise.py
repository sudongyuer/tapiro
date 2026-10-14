"""Scrolling 悬赏 minimises the bar to selected tab, inline accessory and 48 pt 小貘; tapping the minimised tab expands it."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import (TAB_LABELS, UI, accessory, assert_colour, assert_tapir_button, bottom, by_id, corner,  # noqa: E402
                    nav_bar, reach_home, tab, token)

ui = UI(*sys.argv[1:])


def minimised(items):
    labels = TAB_LABELS[ui.locale]
    home, ask = tab(items, labels['bounty']), tab(items, labels['ask'])
    inline = by_id(items, 'urgent-accessory-inline')
    if home and ask and inline and home['frame']['width'] < 50 and by_id(items, 'tab-bounty') is None:
        return {'home': home, 'ask': ask, 'inline': inline}
    return None


ui.element('sign-in-apple')
reach_home(ui)
stage = ui.settled(lambda items: by_id(items, 'live-card-oweMoney') and by_id(items, 'home-stage-urgent'),
                   'home never settled')
items = ui.read()
assert accessory(items) is None, 'accessory shown at the top of 悬赏'
shot = ui.snap('01-top')
assert_colour(shot, corner(stage['frame']), token('--color-stage-urgent', ui.appearance), 'urgent stage')

ui.swipe((200, 650), (200, 250))
ui.swipe((200, 650), (200, 250))
ui.settled(lambda items: (m := minimised(items)) and m['inline'], 'tab bar did not minimise with the inline accessory')
items = ui.read()
parts = minimised(items)
bar = nav_bar(items, ui.locale)
assert bottom(by_id(items, 'home-live-cards')) <= bottom(bar), 'accessory shown while the live cards are on screen'
home, middle, ask = parts['home']['frame'], parts['inline']['frame'], parts['ask']['frame']
assert str(parts['home'].get('AXValue')) == '1', '悬赏 is not the selected minimised tab'
assert home['x'] + home['width'] <= middle['x'] and middle['x'] + middle['width'] <= ask['x'], \
    f'minimised order is not tab | accessory | 小貘: {home} {middle} {ask}'
assert abs(ask['width'] - 48) < 1 and abs(home['width'] - 48) < 1, f'minimised buttons are not 48 pt: {home} {ask}'
assert parts['inline']['AXLabel'].startswith('付给阿杰 RM 15'), f'inline accessory label {parts["inline"]["AXLabel"]}'
shot = ui.snap('02-minimised')
assert_tapir_button(shot, ask, ui.appearance, '48 pt 小貘 button')

ui.tap_point(home['x'] + home['width'] / 2, home['y'] + home['height'] / 2)
ui.settled(lambda items: by_id(items, 'tab-bounty') if by_id(items, 'urgent-accessory') else None,
           'tapping the minimised tab did not expand the tab bar with the full accessory')
items = ui.read()
bar, full = by_id(items, 'tab-bounty')['frame'], by_id(items, 'urgent-accessory')['frame']
assert bar['height'] >= 54 and str(by_id(items, 'tab-bounty').get('AXValue')) == '1', f'expanded tab bar {bar}'
assert bottom(by_id(items, 'urgent-accessory')) <= bar['y'], f'accessory {full} is not above the expanded tab bar {bar}'
shot = ui.snap('03-expanded')
assert_tapir_button(shot, by_id(items, 'tab-ask-tapir')['frame'], ui.appearance, '62 pt 小貘 button')
print('PASS: accessory after scrolling, minimised layout, expand on tap')
