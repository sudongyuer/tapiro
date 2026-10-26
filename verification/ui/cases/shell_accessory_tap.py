"""Tapping the bottom accessory on 拼车, and the inline accessory on a scrolled 悬赏, opens 悬赏 at the top with the live cards fanned out and the accessory hidden."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, accessory, by_id, reach_home, selected  # noqa: E402

DEPS = ['src/features/shell/', 'src/features/home/', 'src/app/(tabs)/']

ARGS = ['-uiVerifySignedIn', 'onboarded']
CARDS = ['live-card-oweMoney', 'live-card-rideSoon', 'live-card-owedToYou', 'live-card-bountyInProgress']
ui = UI(*sys.argv[1:])


def fanned_at_top(items, tab_shown):
    if accessory(items) is not None or (tab_shown and selected(items) != ['tab-bounty']):
        return None
    if not all(by_id(items, card) for card in CARDS) or not by_id(items, 'home-stage-urgent'):
        return None
    return by_id(items, CARDS[-1])


def assert_revealed(message, name, tab_shown=True):
    ui.settled(lambda items: fanned_at_top(items, tab_shown), message)
    items = ui.read()
    stage = by_id(items, 'home-stage-urgent')['frame']
    assert stage['y'] > 0, f'home is not back at the top: stage at {stage}'
    ui.wait_label('live-cards-toggle', lambda label: label == ui.t('home.stack.collapse'), 'live cards are not fanned out')
    ui.snap(name)


reach_home(ui)
ui.settled(lambda items: by_id(items, 'home-stage-urgent'), 'home never settled')
ui.tap('tab-ride')
ui.wait(lambda items: selected(items) == ['tab-ride'] and by_id(items, 'urgent-accessory'),
        '拼车 is not selected with the accessory shown')
ui.snap('01-ride-accessory')
ui.tap('urgent-accessory')
assert_revealed('tapping the accessory on 拼车 did not open 悬赏 at the top with the cards fanned out', '02-from-ride')

ui.swipe((200, 650), (200, 250))
ui.swipe((200, 650), (200, 250))
ui.settled(lambda items: by_id(items, 'urgent-accessory-inline'), 'scrolling 悬赏 did not show the inline accessory')
ui.snap('03-scrolled')
ui.tap('urgent-accessory-inline')
assert_revealed('tapping the inline accessory did not scroll 悬赏 back to the top with the cards fanned out',
                '04-from-scrolled', tab_shown=False)
print('PASS: the accessory opens 悬赏 at the top with the live cards fanned out')
