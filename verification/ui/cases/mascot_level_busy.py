"""249 B on a busy stage: a live item keeps the bubble and a small star over 小貘 says there is something new; the tap
still opens the moment. The star is found by its colour, so the check fails if it is not drawn."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, reach_home, token  # noqa: E402
from mascot import DEPS, GROWN, assert_moment, mascot_box, stage, tap_mascot  # noqa: E402,F401

BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'bountyInProgress', '-uiVerifyMascot', 'levelUp']

ui = UI(*sys.argv[1:])
reach_home(ui)
time.sleep(3)
items = ui.read()
state = next((name for name in ('urgent', 'live') if by_id(items, f'home-stage-{name}')), None)
assert state, 'the fixture feed gives no live stage'
element = stage(ui, state)
assert element.get('AXLabel') != ui.t('reputation.level.grewUp'), 'the level-up took over the bubble of a live item'
ui.at_rest()
shot = ui.snap('01-star')
hint = tuple(int(token('--color-stage-hint', ui.appearance)[i:i + 2], 16) for i in (1, 3, 5))
box = mascot_box(element, items[0]['frame']['width'], state)
gold = sum(1 for p in shot.pixels(box) if max(abs(a - b) for a, b in zip(p, hint)) < 24)
assert gold > 20, f'no star over 小貘: {gold} gold pixels'
tap_mascot(ui, element, state)
assert_moment(ui, 5, 25, 4, 5, [(5, 'scarf')])
print(f'PASS: the bubble stayed with the live item, the star shows ({gold} px) and the tap opens the moment')
