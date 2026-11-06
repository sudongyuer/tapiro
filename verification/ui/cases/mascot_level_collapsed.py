"""257 b: a level-up that lands while 小貘 is not on screen waits. Scrolled past the stage, or on another tab, nothing is
marked played; the collapsed strip keeps the plain line, not 点我看看; coming back plays it and leaves the bubble and the
scarf on screen."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402
from gestures import drag  # noqa: E402
from mascot import assert_grown, says, stage  # noqa: E402

DEPS = ['src/features/reputation/', 'src/features/home/HomeScreen.tsx', 'src/ui/MascotStage.tsx', 'src/ui/Mascot.tsx', 'src/ui/MascotWear.tsx', 'src/lib/i18n/locales/reputation/', 'src/app/(tabs)/bounty/', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyMascot', 'levelUp', '-uiVerifyRepDelayMs', '9000']
WAIT_S = 11.0

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
calm = element.get('AXLabel')
items = ui.read()
width, height = items[0]['frame']['width'], items[0]['frame']['height']
drag(ui, (width / 2, height * 0.75), (width / 2, height * 0.2))
time.sleep(WAIT_S)
assert defaults(ui, 'uiVerifyMascotPlayed') == '', 'the growth played on a collapsed stage'
strip = ui.settled(lambda found: by_id(found, 'home-strip'), 'the strip never showed')
assert ui.t('reputation.level.grewUp') not in (strip.get('AXLabel') or ''), strip.get('AXLabel')
assert calm in (strip.get('AXLabel') or ''), strip.get('AXLabel')
drag(ui, (width / 2, height * 0.3), (width / 2, height * 0.9), duration=0.4, steps=20)
time.sleep(0.2)
drag(ui, (width / 2, height * 0.3), (width / 2, height * 0.9), duration=0.4, steps=20)
says(ui, ui.t('reputation.level.grewUp'))
ui.wait(lambda _: defaults(ui, 'uiVerifyMascotPlayed') == '5' or None, 'the growth never played on the way back', 15)
ui.at_rest()
element = stage(ui)
assert_grown(ui, ui.snap('01-back'), element, width, '--color-wear-red')

relaunch(ui, drop=[])
ui.tap('tab-me')
ui.element('me-profile', timeout=30)
time.sleep(WAIT_S)
assert defaults(ui, 'uiVerifyMascotPlayed') == '', 'the growth played on another tab'
ui.tap('tab-bounty')
says(ui, ui.t('reputation.level.grewUp'))
ui.wait(lambda _: defaults(ui, 'uiVerifyMascotPlayed') == '5' or None, 'the growth never played on return', 15)
ui.at_rest()
assert_grown(ui, ui.snap('02-tab-back'), stage(ui), width, '--color-wear-red')
print('PASS: the growth waited on a collapsed stage and on another tab, and played on the way back')
