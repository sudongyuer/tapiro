"""257 c1, a week already fed: there is no invitation; a tap still asks the server, the leaf falls and fades with no chew
(fall.mp4: the top of 小貘 does not move) and 「这周吃饱啦，周一再来」 shows, then the stage goes back to its own line."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, reach_home  # noqa: E402
from feed import assert_one_feed, back_to, body_tops, leaf_pixels, line  # noqa: E402
from mascot import mascot_box, says, stage, tap_mascot  # noqa: E402
from recording import clip  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/home/', 'src/ui/MascotStage.tsx', 'src/ui/MascotStageParts.tsx', 'src/lib/i18n/locales/coins/', 'src/app/(tabs)/bounty/', 'verification/ui/feed.py', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'one']
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
shot = ui.snap('01-full')
assert leaf_pixels(ui, shot, element, width) < 12, 'the leaf stayed after it fell'
assert_one_feed(ui, 'the tap did not ask the server')
tops = body_tops(ui, video, mascot_box(element, width), width)
assert max(tops) - min(tops) <= 2, f'小貘 chewed without being fed: {min(tops)}..{max(tops)}'
back_to(ui, calm)
print('PASS: an already fed week gets no chew and the full line')
