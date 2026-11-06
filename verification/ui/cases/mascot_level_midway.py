"""257 b: a tap during the growth goes to the end and opens the moment. Taps run every 0.25 s around the moment the read
lands, and the call log shows the moment opened within the growth (plus the push), so the tap fell inside the motion. The
moment opens once; back shows 小貘 at the size measured before the growth, wearing the scarf."""
import sys
import threading
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, AxeError, by_id, reach_home  # noqa: E402
from mascot import GROWN, POSES, assert_moment, assert_wearing, ink_top, mascot_box, rep_times, says, seen_levels, stage  # noqa: E402

DEPS = ['src/features/reputation/', 'src/features/home/HomeScreen.tsx', 'src/ui/MascotStage.tsx', 'src/ui/Mascot.tsx', 'src/ui/MascotWear.tsx', 'src/lib/i18n/locales/reputation/', 'src/app/(tabs)/bounty/', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyMascot', 'levelUp', '-uiVerifyRepDelayMs', '7000']
READ_DELAY_MS = 7000
GROW_MS = 760
PUSH_SLACK_MS = 400
TAP_GAP_S = 0.25
WINDOW_S = 9.0


def tap(x, y):
    try:
        ui.axe('tap', '-x', str(x), '-y', str(y))
    except AxeError:
        return


ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
calm = element.get('AXLabel')
width = ui.read()[0]['frame']['width']
rest_top = ink_top(ui.snap('00-before'), mascot_box(element, width), ui)
size, right, top = POSES['calm']
x, y = round(width - right - size / 2), round(element['frame']['y'] + top + size / 2)
threads = []
deadline = time.monotonic() + WINDOW_S
while time.monotonic() < deadline:
    thread = threading.Thread(target=tap, args=(x, y))
    thread.start()
    threads.append(thread)
    time.sleep(TAP_GAP_S)
for thread in threads:
    thread.join()
assert_moment(ui, 5, 25, 4, 5, [(5, 'scarf')])
assert seen_levels(ui) == [5]
landed = rep_times(ui, 'myMascot')[0] + READ_DELAY_MS
after = rep_times(ui, 'markLevelSeen')[0] - landed
assert after <= GROW_MS + PUSH_SLACK_MS, f'the tap came {after} ms after the read, outside the growth'
ui.tap('BackButton')
ui.gone(GROWN)
says(ui, calm)
ui.at_rest()
shot = ui.snap('01-back')
assert_wearing(ui, shot, element, width, '--color-wear-red')
back_top = ink_top(shot, mascot_box(element, width), ui)
assert abs(back_top - rest_top) <= 2, f'小貘 rests at another size: {rest_top} before, {back_top} after'
assert by_id(ui.read(), GROWN) is None
print(f'PASS: a tap {after} ms after the read opened the moment, and 小貘 is back at full size')
