"""257 b: a level-up that lands while the stage is collapsed waits. Nothing is marked played until the stage shows again;
scrolling back plays it there (back.mp4) and the bubble and the scarf are on screen after it."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from choose import defaults  # noqa: E402
from driver import UI, reach_home  # noqa: E402
from gestures import drag  # noqa: E402
from mascot import assert_grown, last_run, mascot_box, moved_at, says, stage  # noqa: E402
from recording import clip  # noqa: E402

DEPS = ['src/features/reputation/', 'src/features/home/HomeScreen.tsx', 'src/ui/MascotStage.tsx', 'src/ui/Mascot.tsx', 'src/ui/MascotWear.tsx', 'src/lib/i18n/locales/reputation/', 'src/app/(tabs)/bounty/', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyMascot', 'levelUp', '-uiVerifyRepDelayMs', '9000']
WAIT_S = 11.0

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
items = ui.read()
width, height = items[0]['frame']['width'], items[0]['frame']['height']
drag(ui, (width / 2, height * 0.75), (width / 2, height * 0.2))
time.sleep(WAIT_S)
assert defaults(ui, 'uiVerifyMascotPlayed') == '', 'the growth played on a collapsed stage'
with clip(ui, 'back') as video:
    drag(ui, (width / 2, height * 0.3), (width / 2, height * 0.9), duration=0.4, steps=20)
    time.sleep(0.2)
    drag(ui, (width / 2, height * 0.3), (width / 2, height * 0.9), duration=0.4, steps=20)
    time.sleep(3)
says(ui, ui.t('reputation.level.grewUp'))
assert defaults(ui, 'uiVerifyMascotPlayed') == '5', 'the growth never played after the stage came back'
ui.at_rest()
element = stage(ui)
assert_grown(ui, ui.snap('01-back'), element, width, '--color-wear-red')
print('PASS: the growth waited for the stage and played on the way back')
