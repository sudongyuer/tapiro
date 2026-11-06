"""257 b, Reduce Motion: no crouch and no overshoot; the accessory fades in on 小貘 in place and the bubble follows.
reduced.mp4 shows the change inside 0.3 s, and the top of 小貘 stays on the same row in every frame."""
import sys
import tempfile
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, Shot, reach_home  # noqa: E402
from mascot import assert_grown, ink_top, last_run, mascot_box, moved_at, says, stage  # noqa: E402
from recording import clip, frames  # noqa: E402

DEPS = ['src/features/reputation/', 'src/features/home/HomeScreen.tsx', 'src/ui/MascotStage.tsx', 'src/ui/Mascot.tsx', 'src/ui/MascotWear.tsx', 'src/lib/i18n/locales/reputation/', 'src/app/(tabs)/bounty/', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRepDelayMs', '5000', '-uiVerifyMascot', 'levelUp', '-uiVerifyReduceMotion', '1']
WATCH_S = 8.0

ui = UI(*sys.argv[1:])
reach_home(ui)
says(ui, ui.t('reputation.level.grewUp'))
width = ui.read()[0]['frame']['width']
with clip(ui, 'reduced') as video:
    relaunch(ui, drop=[])
    time.sleep(WATCH_S)
says(ui, ui.t('reputation.level.grewUp'))
element = stage(ui)
steps = last_run(moved_at(video, mascot_box(element, width), width))
span = steps[-1] - steps[0]
assert len(steps) >= 2 and span <= 0.3, f'expected a short fade, the frames moved at {steps}'
box = mascot_box(element, width)
with tempfile.TemporaryDirectory() as tmp:
    tops = [ink_top(Shot(path, width), box, ui) for path, at in frames(video, tmp, 0.05)
            if steps[0] - 0.1 <= at <= steps[-1] + 0.1]
tops = [top for top in tops if top is not None]
assert tops and max(tops) - min(tops) <= 2, f'小貘 changed size under Reduce Motion: {tops}'
ui.at_rest()
assert_grown(ui, ui.snap('01-reduced'), element, width, '--color-wear-red')
print(f'PASS: the Reduce Motion swap took {span:.2f} s')
