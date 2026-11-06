"""257 b, Reduce Motion: no crouch and no overshoot, the old 小貘 fades to the new one in place and the bubble follows;
reduced.mp4 shows the whole change inside the two 150 ms fades, far shorter than the 0.76 s growth."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, reach_home  # noqa: E402
from mascot import DEPS, LEVEL_ARGS, mascot_box, moved_at, says, stage  # noqa: E402,F401
from recording import clip  # noqa: E402

BUDGET = 200
ARGS = [*LEVEL_ARGS, '-uiVerifyMascot', 'levelUp', '-uiVerifyReduceMotion', '1']
WATCH_S = 8.0

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
width = ui.read()[0]['frame']['width']
with clip(ui, 'reduced') as video:
    time.sleep(WATCH_S)
says(ui, ui.t('reputation.level.grewUp'))
steps = moved_at(video, mascot_box(element, width), width)
assert steps, '小貘 never changed'
span = steps[-1] - steps[0]
assert span <= 0.6, f'the fade took {span:.2f} s: {steps}'
ui.at_rest()
ui.capture('01-reduced')
print(f'PASS: the Reduce Motion swap took {span:.2f} s')
