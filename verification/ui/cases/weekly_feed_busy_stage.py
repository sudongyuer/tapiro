"""254 A with a live item: the bubble stays with the item and a small leaf beside 小貘 says the week is open; a tap feeds and
「…」 and the answer show over the item's line for a moment, then the item's line comes back and the leaf is gone."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, reach_home  # noqa: E402
from feed import back_to, bubble_pixels, feeds, leaf_pixels, line  # noqa: E402
from mascot import says, stage, tap_mascot  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/home/', 'src/ui/MascotStage.tsx', 'src/ui/MascotStageParts.tsx', 'src/lib/i18n/locales/coins/', 'src/app/(tabs)/bounty/', 'verification/ui/feed.py', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'bountyInProgress', '-uiVerifyCoins', 'many', '-uiVerifyCoinsDelayMs', '4000']
STATE = 'live'

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui, STATE)
live = element.get('AXLabel')
assert live != line(ui, 'idle'), 'the invitation took over a live item'
time.sleep(6)
ui.at_rest()
width = ui.read()[0]['frame']['width']
shot = ui.snap('01-leaf')
leaf = leaf_pixels(ui, shot, element, width, STATE)
assert leaf > 20, f'no leaf beside 小貘: {leaf} px'
assert by_id(ui.read(), f'home-stage-{STATE}').get('AXLabel') == live
tap_mascot(ui, element, STATE)
says(ui, line(ui, 'waiting'), STATE)
says(ui, line(ui, 'fed'), STATE)
time.sleep(0.4)
white = bubble_pixels(ui, ui.snap('02-fed'), element, 90)
assert white > 200, f'the answer is hidden on a busy stage: {white} px'
assert len(feeds(ui, 1)) == 1
back_to(ui, live, STATE)
ui.at_rest()
after = leaf_pixels(ui, ui.snap('03-after'), element, width, STATE)
assert after < 12, f'the leaf stayed after feeding: {after} px'
print(f'PASS: the live line stayed, the leaf showed ({leaf} px) and the answer passed over it')
