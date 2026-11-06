"""257 c, Reduce Motion: the leaf shows at the mouth with no drop and no chew (reduced.mp4: nothing above the mouth, the top of 小貘 stays on its row); `fed`
removes the leaf and shows the thanks."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, reach_home  # noqa: E402
from feed import assert_thanks, body_tops, feeds, leaf_above, leaf_pixels, line  # noqa: E402
from mascot import mascot_box, says, stage, tap_mascot  # noqa: E402
from recording import clip  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/home/', 'src/ui/MascotStage.tsx', 'src/ui/MascotStageParts.tsx', 'src/lib/i18n/locales/coins/', 'src/app/(tabs)/bounty/', 'verification/ui/feed.py', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'many', '-uiVerifyCoinsDelayMs', '6000', '-uiVerifyReduceMotion', '1']

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
says(ui, line(ui, 'idle'))
width = ui.read()[0]['frame']['width']
with clip(ui, 'reduced') as video:
    tap_mascot(ui, element)
    says(ui, line(ui, 'waiting'))
    waiting = ui.snap('01-waiting')
    says(ui, line(ui, 'fed'))
    fed = ui.snap('02-fed')
leaf = leaf_pixels(ui, waiting, element, width)
assert leaf > 40, f'no leaf at the mouth: {leaf} px'
high = leaf_above(ui, video, element, width)
assert high < 12, f'the leaf dropped under Reduce Motion: {high} px above the mouth'
tops = body_tops(ui, video, mascot_box(element, width), width)
assert max(tops) - min(tops) <= 2, f'小貘 moved under Reduce Motion: {min(tops)}..{max(tops)}'
assert leaf_pixels(ui, fed, element, width) < 12, 'the leaf stayed on fed'
assert_thanks(fed)
assert len(feeds(ui, 1)) == 1
print('PASS: the leaf faded in and out with no drop and no chew')
