"""With three live items including a payment, home shows the urgent stage, the pay card in front, two peeks, and fans out to three cards."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_colour, assert_home, by_id, card_fill, token  # noqa: E402

ARGS = ['-uiVerifyShellFeed', 'oweMoney,rideSoon,bountyInProgress', '-uiVerifySignedIn', 'onboarded']
CARDS = ['oweMoney', 'rideSoon', 'bountyInProgress']

ui = UI(*sys.argv[1:])
assert_home(ui, '01-stacked', 'urgent', CARDS)
ui.tap('live-cards-toggle')
ui.settled(lambda items: all(by_id(items, f'live-card-{c}') for c in CARDS) and by_id(items, 'live-card-rideSoon'),
           'three cards did not fan out')
items = ui.read()
assert by_id(items, 'live-card-owedToYou') is None, 'a fourth card appeared'
assert not by_id(items, 'live-card-peek-1'), 'peek still shown when fanned'
shot = ui.snap('02-fanned')
assert_colour(shot, card_fill(by_id(items, 'live-card-rideSoon')['frame']), token('--color-card-ride', ui.appearance),
              'ride card')
print('PASS: three cards stacked and fanned')
