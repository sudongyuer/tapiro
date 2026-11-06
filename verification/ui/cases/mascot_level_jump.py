"""RepBC2 when the level moved more than one step, and past the named levels: Lv.1 → Lv.3 lists 小红帽 and 书包; Lv.5 →
Lv.6 reads 大貘 and has no 解锁了 card, since cover colours are not built."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, reach_home  # noqa: E402
from mascot import assert_grown, assert_moment, says, stage, tap_mascot  # noqa: E402
from profile import assert_clears_tab_bar  # noqa: E402

DEPS = ['src/features/reputation/', 'src/features/home/HomeScreen.tsx', 'src/ui/MascotStage.tsx', 'src/ui/Mascot.tsx', 'src/ui/MascotWear.tsx', 'src/lib/i18n/locales/reputation/', 'src/app/(tabs)/bounty/', 'verification/ui/mascot.py', 'verification/ui/profile.py', 'verification/ui/recording.py', 'verification/ui/gestures.py']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyMascot', 'jump']
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
says(ui, ui.t('reputation.level.grewUp'))
ui.at_rest()
assert_grown(ui, ui.snap('00-backpack'), element, ui.read()[0]['frame']['width'], '--color-wear-bag')
tap_mascot(ui, element)
assert_moment(ui, 3, 8, 1, 3, [(2, 'red_hat'), (3, 'backpack')])
assert_clears_tab_bar(ui, 'mascot-grown-go')
ui.capture('01-two-levels')

relaunch(ui, drop=['-uiVerifyMascot', 'jump'], add=['-uiVerifyMascot', 'grown'])
element = stage(ui)
says(ui, ui.t('reputation.level.grewUp'))
ui.at_rest()
tap_mascot(ui, element)
assert_moment(ui, 6, 40, 5, 6, [])
assert_clears_tab_bar(ui, 'mascot-grown-go')
ui.capture('02-past-named')
print('PASS: two levels list two accessories and Lv.6 lists none')
