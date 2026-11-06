"""249 B, 257 b1: 小貘 reaches Lv.5 and the stage shows it once: crouch, grow (timed from the frames of grow.mp4), the
scarf and the 我长大了 bubble that stays until tapped. The tap opens 「小貘长大的时刻」 (RepBC2), marks level 5 seen once
and 去看看我的小貘 opens your own profile; back on home the bubble is gone. A relaunch with the level not yet seen keeps
the bubble and does not play again (replay.mp4), and a tap on the bubble opens the moment too. Motion: one appearance with video."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402
from mascot import GROWN, assert_grown, assert_moment, ink_top, last_run, mascot_box, moved_at, says, seen_levels, stage, tap_mascot  # noqa: E402
from profile import open_profile, scroll_to  # noqa: E402
from recording import clip  # noqa: E402

DEPS = ['src/features/reputation/', 'src/features/home/HomeScreen.tsx', 'src/ui/MascotStage.tsx', 'src/ui/Mascot.tsx', 'src/ui/MascotWear.tsx', 'src/lib/i18n/locales/reputation/', 'src/app/(tabs)/bounty/', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRepDelayMs', '5000', '-uiVerifyMascot', 'levelUp']
LOCALES = ['zh-Hans', 'ms']
WATCH_S = 8.0

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
calm = element.get('AXLabel')
grew = ui.t('reputation.level.grewUp')
assert calm != grew, 'the stage spoke before the mascot was read'
says(ui, grew)
width = ui.read()[0]['frame']['width']
with clip(ui, 'grow') as video:
    relaunch(ui, drop=[])
    time.sleep(WATCH_S)
says(ui, grew)
element = stage(ui)
steps = last_run(moved_at(video, mascot_box(element, width), width))
assert len(steps) >= 5, f'小貘 moved in {len(steps)} frames only, it never grew: {steps}'
span = steps[-1] - steps[0]
assert 0.2 <= span <= 1.8, f'the growth took {span:.2f} s of frames {steps}'
assert defaults(ui, 'uiVerifyMascotPlayed') == '5', 'the played level was not stored'
ui.at_rest()
grown_shot = ui.snap('01-grown')
assert_grown(ui, grown_shot, element, width, '--color-wear-red')
full_top = ink_top(grown_shot, mascot_box(element, width), ui)
assert not seen_levels(ui, timeout=1), 'the level was marked seen before the tap'

tap_mascot(ui, element)
assert_moment(ui, 5, 25, 4, 5, [(5, 'scarf')])
assert seen_levels(ui) == [5], 'opening the moment did not mark level 5 seen'
go = ui.element('mascot-grown-go')
assert go.get('AXLabel') == ui.t('reputation.grown.go')
assert_touch_target(go, ui.t('reputation.grown.go'))
tab_top = by_id(ui.read(), 'tab-bounty')['frame']['y']
if ui.locale == 'zh-Hans':
    assert go['frame']['y'] + go['frame']['height'] <= tab_top, f'the tab bar covers the button: {go["frame"]} vs {tab_top}'
ui.at_rest()
ui.capture('02-moment')

ui.tap('BackButton')
ui.gone(GROWN)
says(ui, calm)
ui.at_rest()
back_top = ink_top(ui.snap('03-back'), mascot_box(element, width), ui)
assert full_top is not None and abs(full_top - back_top) <= 2, f'小貘 rests at another size: {full_top} vs {back_top}'
tap_mascot(ui, element)
time.sleep(2)
assert by_id(ui.read(), GROWN) is None, 'the moment opened a second time'
assert seen_levels(ui, 2, timeout=1) == [5], 'the level was marked seen twice'

with clip(ui, 'replay') as video:
    relaunch(ui, drop=[], keep_records=True)
    time.sleep(WATCH_S)
says(ui, grew)
element = stage(ui)
replayed = last_run(moved_at(video, mascot_box(element, width), width))
assert len(replayed) <= 3, f'the growth played again: {replayed}'
ui.tap_point(70, element['frame']['y'] + 40)
ui.element(GROWN, timeout=20)
scroll_to(ui, 'mascot-grown-go')
ui.tap('mascot-grown-go')
open_profile(ui)
ui.element('profile-level')
ui.at_rest()
ui.capture('04-profile')
ui.tap('tab-bounty')
ui.element('home-scroll')
assert by_id(ui.read(), GROWN) is None, 'the moment stayed on the home stack'
print(f'PASS: 小貘 grew over {span:.2f} s, {len(replayed)} frames moved on the relaunch, the moment opened once and led to the profile')
