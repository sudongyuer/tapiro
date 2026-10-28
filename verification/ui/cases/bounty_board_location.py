"""Location on the board (28A, 29A): while permission is undetermined a card explains it; 允许定位 (fixture permission
answer) brings the distance axis from 你; a denied answer shows 选一个地方 and no axis; picking Sunway Geo Residences in the
search shows 「Sunway Geo Residences 附近」 with 换, an axis from 这里 and distances on the cards, and the place survives a
relaunch; 先不用 shows the row, and after a relaunch the card does not come back."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import cards, screen, visible  # noqa: E402
from bounty import relaunch, search_places  # noqa: E402
from driver import UI, assert_touch_target, by_id, close, reach_home  # noqa: E402

DEPS = ['src/features/bounty/', 'src/features/home/', 'src/app/(tabs)/', 'verification/ui/bounty.py',
        'verification/ui/board.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 420
RESET = ['-uiVerifyBoardPlace', 'none', '-uiVerifyLocation', 'undetermined']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBoardPlace', 'none',
        '-uiVerifyLocation', 'undetermined']
PLACE = 'Sunway Geo Residences'
CARD_FILL = {'light': (255, 255, 255), 'dark': (28, 28, 30)}
DISTANCE = re.compile(r'\d+(?:\.\d)?\s(?:m|km)')

ui = UI(*sys.argv[1:])


def restart(*args):
    relaunch(ui, drop=RESET, add=list(args))
    reach_home(ui)


def labelled(identifier, text, message):
    return ui.wait_label(identifier, lambda label: text in label, message)


def show_card():
    card = visible(ui, 'bounty-location-card')
    visible(ui, 'bounty-location-later')
    return card


def no_axis():
    ui.gone('bounty-axis')


def axis_from(origin_key):
    expected = ui.t('bounty.board.axis.label', origin=ui.t(origin_key))
    axis = visible(ui, 'bounty-axis')
    assert axis.get('AXLabel') == expected, f'the axis reads {axis.get("AXLabel")!r}, expected {expected!r}'


def distances_on_cards():
    shown = [c for c in cards(ui.read()) if DISTANCE.search(c.get('AXLabel') or '')]
    assert shown, 'no card reads a distance'
    return len(shown)


reach_home(ui)
card = show_card()
assert ui.t('bounty.board.location.title') in (card.get('AXLabel') or ''), card.get('AXLabel')
assert_touch_target(ui.element('bounty-location-allow'), '允许定位')
assert_touch_target(ui.element('bounty-location-later'), '先不用')
assert by_id(ui.read(), 'bounty-axis') is None, 'the axis shows before location is allowed'
assert not any(DISTANCE.search(c.get('AXLabel') or '') for c in cards(ui.read())), 'cards read distances without a point'
ui.at_rest()
ui.capture('01-card')

ui.tap('bounty-location-allow')
ui.gone('bounty-location-card')
axis_from('bounty.board.axis.you')
print(f'allowed: axis from 你, {distances_on_cards()} cards with distances')
ui.at_rest()
ui.capture('02-allowed')

restart('-uiVerifyBoardPlace', 'none', '-uiVerifyLocation', 'undeterminedDeny')
show_card()
ui.tap('bounty-location-allow')
row = labelled('bounty-place-row', ui.t('bounty.board.place.pick'), 'a denied answer does not show 选一个地方')
assert ui.t('bounty.board.place.pickSubtitle') in (row.get('AXLabel') or ''), row.get('AXLabel')
assert_touch_target(row, '选一个地方')
no_axis()
assert by_id(ui.read(), 'bounty-location-card') is None, 'the card stays after a denied answer'
ui.at_rest()
ui.capture('03-denied')

visible(ui, 'bounty-place-row')
ui.tap('bounty-place-row')
ui.element('place-search')
ui.gone('bounty-place-row')
s = screen(ui.read())
ui.swipe((1, s['height'] / 2), (s['width'] * 0.8, s['height'] / 2), 0.4)
ui.gone('place-search')
row = ui.settled(lambda items: by_id(items, 'bounty-place-row'), 'swiping back did not return to the board')
ui.at_rest()
shot = ui.snap('03b-returned')
f = row['frame']
fill = shot.rgb(f['x'] + f['width'] - 60, f['y'] + 6)
assert close(fill, CARD_FILL[ui.appearance], 6), f'the row is still selected after returning: {fill}'

visible(ui, 'bounty-place-row')
ui.tap('bounty-place-row')
ui.element('place-search')
ui.gone('bounty-place-row')
assert by_id(ui.read(), 'place-search-current') is None, 'the board search offers 用当前位置'
search_places(ui, 'sunway', focused=True)
ui.wait_label('place-search-result-0', lambda label: PLACE in label, f'the first result is not {PLACE}')
ui.capture('04-search')
ui.tap('place-search-result-0')
ui.gone('place-search')
near = ui.t('bounty.board.place.near', place=PLACE)
labelled('bounty-place-row', near, f'the row does not read {near}')
assert_touch_target(ui.element('bounty-place-change'), '换')
axis_from('bounty.board.axis.here')
print(f'chosen place: axis from 这里, {distances_on_cards()} cards with distances')
visible(ui, 'bounty-place-row')
ui.at_rest()
ui.capture('05-place')

restart('-uiVerifyLocation', 'undeterminedDeny')
labelled('bounty-place-row', near, 'the chosen place is lost after a relaunch')
axis_from('bounty.board.axis.here')
assert by_id(ui.read(), 'bounty-location-card') is None, 'the card shows over a chosen place'
ui.at_rest()
ui.capture('06-relaunched')

restart('-uiVerifyBoardPlace', 'none', '-uiVerifyLocation', 'undetermined')
show_card()
ui.tap('bounty-location-later')
labelled('bounty-place-row', ui.t('bounty.board.place.pick'), '先不用 does not show 选一个地方')
no_axis()
ui.at_rest()
ui.capture('07-later')

restart('-uiVerifyLocation', 'undetermined')
labelled('bounty-place-row', ui.t('bounty.board.place.pick'), 'the row is gone after a relaunch')
assert by_id(ui.read(), 'bounty-location-card') is None, 'the card comes back after 先不用 and a relaunch'
no_axis()
ui.capture('08-later-relaunched')
print('PASS: card, allowed axis, denied row, chosen place kept, 先不用 remembered')
