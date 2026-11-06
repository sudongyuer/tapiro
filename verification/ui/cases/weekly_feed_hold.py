"""W11: an answer that lands with the stage scrolled away waits: after six seconds off screen, back on the stage the thanks
still shows, then its 4 s run out and the stage returns to its own line."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, reach_home  # noqa: E402
from feed import back_to, feeds, line  # noqa: E402
from gestures import drag  # noqa: E402
from mascot import says, stage, tap_mascot  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/home/', 'src/ui/MascotStage.tsx', 'src/ui/MascotStageParts.tsx', 'src/lib/i18n/locales/coins/', 'src/app/(tabs)/bounty/', 'verification/ui/feed.py', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'many', '-uiVerifyCoinsDelayMs', '3000']
OFF_SCREEN_S = 8

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
says(ui, line(ui, 'idle'))
items = ui.read()
width, height = items[0]['frame']['width'], items[0]['frame']['height']
tap_mascot(ui, element)
drag(ui, (width / 2, height * 0.75), (width / 2, height * 0.2), duration=0.5, steps=20)
time.sleep(OFF_SCREEN_S)
assert len(feeds(ui, 1)) == 1, 'the tap did not feed'
says(ui, line(ui, 'fed'))
drag(ui, (width / 2, height * 0.3), (width / 2, height * 0.9), duration=0.4, steps=20)
time.sleep(0.2)
drag(ui, (width / 2, height * 0.3), (width / 2, height * 0.9), duration=0.4, steps=20)
ui.capture('01-back')
back_to(ui, ui.t('home.say.calm'))
print('PASS: the answer waited for the stage')
