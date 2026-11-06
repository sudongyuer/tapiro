"""257 c1, a week already fed: there is no invitation; a tap still asks the server, the leaf falls and fades with no chew
(fall.mp4: the top of 小貘 does not move) and 「这周吃饱啦，周一再来」 shows, a tap on the shown answer starts again; then the stage goes back to its own line."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, reach_home  # noqa: E402
from feed import back_to, body_tops, bubble_pixels, feeds, leaf_peak, leaf_pixels, line  # noqa: E402
from mascot import mascot_box, says, stage, tap_mascot  # noqa: E402
from recording import clip  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/home/', 'src/ui/MascotStage.tsx', 'src/ui/MascotStageParts.tsx', 'src/lib/i18n/locales/coins/', 'src/app/(tabs)/bounty/', 'verification/ui/feed.py', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'one', '-uiVerifyCoinsDelayMs', '5000']
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
calm = ui.t('home.say.calm')
says(ui, calm)
width = ui.read()[0]['frame']['width']
with clip(ui, 'fall') as video:
    tap_mascot(ui, element)
    says(ui, line(ui, 'alreadyFed'))
    tap_mascot(ui, element)
    says(ui, line(ui, 'waiting'))
    says(ui, line(ui, 'alreadyFed'))
    time.sleep(0.4)
    shot = ui.snap('01-full')
white = bubble_pixels(ui, shot, element, 90)
assert white > 200, f'the bubble is hidden after the second tap: {white} px'
assert leaf_pixels(ui, shot, element, width) < 12, 'the leaf stayed after it fell'
assert len(feeds(ui, 2)) == 2, 'a tap on a shown answer did not start again'
assert len(feeds(ui, 3, timeout=3)) == 2, 'a feed was sent on its own'
peak = leaf_peak(ui, video, element, width)
assert peak > 40, f'no leaf ever fell: {peak} px'
tops = body_tops(ui, video, mascot_box(element, width), width)
assert max(tops) - min(tops) <= 2, f'小貘 chewed without being fed: {min(tops)}..{max(tops)}'
back_to(ui, calm)
print('PASS: an already fed week gets no chew and the full line')
