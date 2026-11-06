"""249 B, 257 b1: 小貘 reaches Lv.5 and the stage shows it once: crouch, grow (timed from the frames of grow.mp4), the
scarf and the 我长大了 bubble that stays until tapped. The tap opens 「小貘长大的时刻」 (RepBC2), marks level 5 seen once
and 去看看我的小貘 opens your own profile; back on home the bubble is gone. A relaunch with the level not yet seen keeps
the bubble and does not play again (replay.mp4). Motion: one appearance with video."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402
from mascot import DEPS, GROWN, LEVEL_ARGS, assert_moment, mascot_box, moved_at, says, seen_levels, stage, tap_mascot  # noqa: E402,F401
from profile import open_profile  # noqa: E402
from recording import clip  # noqa: E402

BUDGET = 300
ARGS = [*LEVEL_ARGS, '-uiVerifyMascot', 'levelUp']
LOCALES = ['zh-Hans', 'ms']
WATCH_S = 8.0

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
calm = element.get('AXLabel')
grew = ui.t('reputation.level.grewUp')
assert calm != grew, 'the stage spoke before the mascot was read'
width = ui.read()[0]['frame']['width']
with clip(ui, 'grow') as video:
    time.sleep(WATCH_S)
says(ui, grew)
steps = moved_at(video, mascot_box(element, width), width)
assert len(steps) >= 5, f'小貘 moved in {len(steps)} frames only, it never grew: {steps}'
span = steps[-1] - steps[0]
assert 0.4 <= span <= 1.8, f'the growth took {span:.2f} s of frames {steps}'
assert defaults(ui, 'uiVerifyMascotPlayed') == '5', 'the played level was not stored'
ui.at_rest()
ui.capture('01-grown')
assert not seen_levels(ui, timeout=1), 'the level was marked seen before the tap'

tap_mascot(ui, element)
assert_moment(ui, 5, 25, 4, 5, [(5, 'scarf')])
assert seen_levels(ui) == [5], 'opening the moment did not mark level 5 seen'
go = ui.element('mascot-grown-go')
assert go.get('AXLabel') == ui.t('reputation.grown.go')
assert_touch_target(go, ui.t('reputation.grown.go'))
ui.at_rest()
ui.capture('02-moment')

ui.tap('BackButton')
ui.gone(GROWN)
says(ui, calm)
ui.at_rest()
ui.capture('03-back')
tap_mascot(ui, element)
time.sleep(2)
assert by_id(ui.read(), GROWN) is None, 'the moment opened a second time'
assert seen_levels(ui, 2, timeout=1) == [5], 'the level was marked seen twice'

relaunch(ui, drop=[], keep_records=True)
element = stage(ui)
with clip(ui, 'replay') as video:
    time.sleep(WATCH_S)
says(ui, grew)
steps = moved_at(video, mascot_box(element, width), width)
assert len(steps) <= 2, f'the growth played again: {steps}'
tap_mascot(ui, element)
ui.element(GROWN, timeout=20)
ui.tap('mascot-grown-go')
open_profile(ui)
ui.element('profile-level')
ui.at_rest()
ui.capture('04-profile')
print(f'PASS: 小貘 grew over {span:.2f} s in {len(steps)} replay frames, the moment opened once and led to the profile')
