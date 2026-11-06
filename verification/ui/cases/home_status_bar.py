"""The stage stays light in both appearances, so the status bar over 悬赏 has dark ink, at the top of the board and after
coming back to it; another tab and a pushed detail follow the appearance again. Pixels of the clock, since the
accessibility tree cannot see the status bar. Only a dark run can fail on the stage: in light the ink is dark anyway."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import visible  # noqa: E402
from driver import UI, luma, reach_home  # noqa: E402

DEPS = ['src/app/(tabs)/', 'src/app/_layout.tsx', 'src/features/home/', 'src/ui/MascotStage.tsx',
        'verification/ui/board.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']
BUDGET = 180
CLOCK = {'x': 50, 'y': 20, 'width': 50, 'height': 24}
CARD = 'bounty-card-fixture-bounty-01'

ui = UI(*sys.argv[1:])


def assert_ink(name, dark):
    ui.at_rest()
    values = [luma(rgb) for rgb in ui.snap(name).pixels(CLOCK)]
    found = min(values) if dark else max(values)
    print(f'{name}: {"darkest" if dark else "brightest"} clock luma {found:.0f}')
    assert (found < 90) if dark else (found > 200), f'{name}: the clock ink is wrong in {ui.appearance}: {found:.0f}'


reach_home(ui)
assert_ink('01-stage-top', True)

ui.tap('tab-ride')
ui.element('ride-screen')
assert_ink('02-other-tab', ui.appearance == 'light')

ui.tap('tab-bounty')
ui.element('home-scroll')
assert_ink('03-stage-again', True)

card = visible(ui, CARD)
ui.at_rest()
f = card['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
ui.element('bounty-detail-title')
assert_ink('04-pushed-detail', ui.appearance == 'light')

ui.tap('BackButton')
ui.element('home-scroll')
ui.gone('bounty-detail-title')
assert_ink('05-stage-after-back', True)
print('PASS: dark ink over the stage, the appearance everywhere else')
