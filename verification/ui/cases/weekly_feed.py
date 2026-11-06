"""253 A, 254 A, 257 c1: a week not yet fed: the bubble invites and a tap drops a leaf at once. With a slow answer the leaf
waits at the mouth under 「…」, nothing reads as paid; on `fed` 小貘 chews (feed.mp4, the top of 小貘 dips) and 「谢谢！+1 貘币」
shows, then the stage goes back to its own line and the invitation is gone. One write. Motion: one appearance with video."""
import json
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, reach_home  # noqa: E402
from feed import assert_one_feed, back_to, body_tops, bubble_pixels, leaf_pixels, line  # noqa: E402
from mascot import mascot_box, says, stage, tap_mascot  # noqa: E402
from recording import clip  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/home/', 'src/ui/MascotStage.tsx', 'src/ui/MascotStageParts.tsx', 'src/lib/i18n/locales/coins/', 'src/app/(tabs)/bounty/', 'verification/ui/feed.py', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'many', '-uiVerifyCoinsDelayMs', '6000']
LOCALES = ['zh-Hans', 'ms']
CHEW_DIP = 3

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
says(ui, line(ui, 'idle'))
width = ui.read()[0]['frame']['width']
ui.at_rest()
ui.capture('01-idle')
with clip(ui, 'feed') as video:
    tap_mascot(ui, element)
    says(ui, line(ui, 'waiting'))
    waiting = ui.snap('02-waiting')
    says(ui, line(ui, 'fed'))
    time.sleep(0.4)
    fed = ui.snap('03-fed')
leaf = leaf_pixels(ui, waiting, element, width)
assert leaf > 40, f'no leaf at the mouth while waiting: {leaf} px'
dots = bubble_pixels(ui, waiting, element)
assert dots > 200, f'the waiting bubble is not visible: {dots} px'
assert json.loads((ui.output / '03-fed.json').read_text()), 'no tree for the thanks'
assert line(ui, 'fed') in (ui.output / '03-fed.json').read_text(), 'the shot missed the thanks'
tops = body_tops(ui, video, mascot_box(element, width), width)
assert max(tops) - min(tops) >= CHEW_DIP, f'小貘 never chewed: tops {min(tops)}..{max(tops)}'
assert_one_feed(ui, 'the tap did not send one feed')
assert leaf_pixels(ui, fed, element, width) < 12, 'the leaf stayed after the chew'
white = bubble_pixels(ui, fed, element, 90)
assert white > 200, f'the thanks bubble is not visible: {white} px'
back_to(ui, ui.t('home.say.calm'))
ui.at_rest()
ui.capture('04-after')
print(f'PASS: the leaf waited, 小貘 chewed {max(tops) - min(tops):.0f} pt and the thanks followed one write')
