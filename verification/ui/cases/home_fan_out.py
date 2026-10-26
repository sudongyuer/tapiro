"""Four urgent cards stack and fan out with the toggle; the accessory stays hidden until the last fanned card passes under the bar."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, accessory, assert_colour, bottom, by_id, card_fill, corner, nav_bar, reach_home, token  # noqa: E402

DEPS = ['src/features/home/', 'src/features/shell/', 'src/app/(tabs)/_layout.tsx', 'src/app/(tabs)/bounty/']

LOCALES = ['zh-Hans', 'ms']
TOGGLE = {'zh-Hans': ('摊开 · 4 件', '收起'), 'ms': ('Bentangkan · 4', 'Susun')}
CARDS = ['live-card-oweMoney', 'live-card-rideSoon', 'live-card-owedToYou', 'live-card-bountyInProgress']
PEEKS = ['live-card-peek-1', 'live-card-peek-2']

ARGS = ['-uiVerifySignedIn', 'onboarded']
ui = UI(*sys.argv[1:])
fan_out, collapse = TOGGLE[ui.locale]


def present(items, identifiers):
    return [i for i in identifiers if by_id(items, i)]


def assert_stacked(name):
    ui.settled(lambda items: by_id(items, 'live-card-peek-2') if present(items, CARDS) == CARDS[:1] else None,
               'cards did not stack')
    items = ui.read()
    assert present(items, PEEKS) == PEEKS, f'peeks while stacked: {present(items, PEEKS)}'
    ui.wait_label('live-cards-toggle', lambda label: label == fan_out, f'toggle does not read {fan_out}')
    shot = ui.snap(name)
    assert_colour(shot, card_fill(by_id(items, 'live-card-oweMoney')['frame']),
                  token('--color-card-pay', ui.appearance), 'front pay card')
    return items, shot


reach_home(ui)
stage = ui.settled(lambda items: by_id(items, 'home-stage-urgent'), 'urgent stage missing')
items, shot = assert_stacked('01-stacked')
assert_colour(shot, corner(stage['frame']),
              token('--color-stage-urgent', ui.appearance), 'urgent stage')
assert accessory(items) is None, 'accessory shown at the top of 悬赏'

ui.tap('live-cards-toggle')
last = ui.settled(lambda items: by_id(items, CARDS[-1]) if present(items, CARDS) == CARDS else None,
                  'cards did not fan out')
items = ui.read()
assert not present(items, PEEKS), f'peeks still shown when fanned: {present(items, PEEKS)}'
ui.wait_label('live-cards-toggle', lambda label: label == collapse, f'toggle does not read {collapse}')
frames = [by_id(items, c)['frame'] for c in CARDS]
for upper, lower, name in zip(frames, frames[1:], CARDS[1:]):
    assert bottom({'frame': upper}) <= lower['y'] + 0.5, f'{name} overlaps the card above when fanned'
for f, name in zip(frames, CARDS):
    assert f['x'] >= 0 and f['x'] + f['width'] <= 402, f'{name} overflows the screen: {f}'
shot = ui.snap('02-fanned')
assert_colour(shot, card_fill(frames[1]), token('--color-card-ride', ui.appearance), 'ride card')

hidden_gap = shown = progress_checked = None
distance = 300
for step in range(12):
    ui.swipe((200, 650), (200, 650 - distance), duration=2 if distance > 80 else 1)
    last = ui.settled(lambda items: by_id(items, CARDS[-1]), f'last card never settled after swipe {step}')
    items = ui.read()
    edge = bottom(nav_bar(items, ui.locale))
    print(f'step {step}: last card bottom {bottom(last):.0f}, bar bottom {edge:.0f}, accessory {accessory(items) is not None}')
    if bottom(last) > edge + 2:
        assert accessory(items) is None, f'accessory shown while the last card ends at {bottom(last):.0f}, bar at {edge:.0f}'
        shot = ui.snap(f'03-last-card-on-screen-{step}')
        fill = card_fill(last['frame'])
        if not progress_checked and fill['y'] > edge and fill['y'] + fill['height'] < 780:
            assert_colour(shot, fill, token('--color-card-progress', ui.appearance), 'in-progress card')
            progress_checked = True
        gap = bottom(last) - edge
        hidden_gap = gap
        distance = min(300, gap - 20) if gap > 60 else 80
    elif bottom(last) < edge - 2:
        ui.wait(accessory, f'accessory missing after the last card passed under the bar ({bottom(last):.0f} < {edge:.0f})',
                timeout=10)
        shown = step
        ui.capture('04-last-card-under-bar')
        break
assert shown is not None, 'scrolling never moved the last card past the bar'
assert hidden_gap is not None and hidden_gap <= 60, f'no hidden check close to the bar (closest gap {hidden_gap})'
assert progress_checked, 'the in-progress card was never fully on screen for a colour check'

for _ in range(6):
    toggle = ui.settled(lambda items: by_id(items, 'live-cards-toggle'), 'toggle never settled')
    if 180 < toggle['frame']['y'] < 650:
        break
    ui.swipe((200, 400), (200, 550) if toggle['frame']['y'] <= 180 else (200, 250), duration=1.5)
ui.tap('live-cards-toggle')
ui.wait_label('live-cards-toggle', lambda label: label == fan_out, 'toggle did not stack the cards')
for _ in range(4):
    stage = by_id(ui.read(), 'home-stage-urgent')
    if stage and stage['frame']['y'] > 100:
        break
    ui.swipe((200, 250), (200, 750))
assert_stacked('05-stacked-again')
print('PASS: stacked, fanned, accessory threshold at the last fanned card, stacked again')
