"""257 b: a tap during the growth goes to the end and opens the moment. Taps run from before the read lands, so the first
one that can open lands inside the motion; the moment opens once and back shows 小貘 at rest at full size with the scarf."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, reach_home  # noqa: E402
from mascot import GROWN, assert_moment, ink_top, mascot_box, says, seen_levels, stage, tap_mascot  # noqa: E402

DEPS = ['src/features/reputation/', 'src/features/home/HomeScreen.tsx', 'src/ui/MascotStage.tsx', 'src/ui/Mascot.tsx', 'src/ui/MascotWear.tsx', 'src/lib/i18n/locales/reputation/', 'src/app/(tabs)/bounty/', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyMascot', 'levelUp', '-uiVerifyRepDelayMs', '5000']
TRIES = 40

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
calm = element.get('AXLabel')
for _ in range(TRIES):
    tap_mascot(ui, element)
    if by_id(ui.read(), GROWN):
        break
assert_moment(ui, 5, 25, 4, 5, [(5, 'scarf')])
assert seen_levels(ui) == [5]
ui.tap('BackButton')
ui.gone(GROWN)
says(ui, calm)
ui.at_rest()
width = ui.read()[0]['frame']['width']
top = ink_top(ui.snap('01-back'), mascot_box(element, width), ui)
assert top is not None and top < element['frame']['y'] + 30, f'小貘 is not at full size: top {top}'
print(f'PASS: a tap during the growth opened the moment; 小貘 top at {top:.0f} pt')
