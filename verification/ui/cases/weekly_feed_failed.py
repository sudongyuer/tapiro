"""A failed feed: the leaf falls, no chew, 「没喂上，再点一下试试」; nothing is resent on its own; a second tap feeds."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, reach_home  # noqa: E402
from feed import feeds, line  # noqa: E402
from mascot import says, stage, tap_mascot  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/home/', 'src/ui/MascotStage.tsx', 'src/ui/MascotStageParts.tsx', 'src/lib/i18n/locales/coins/', 'src/app/(tabs)/bounty/', 'verification/ui/feed.py', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'many', '-uiVerifyCoinsFail', 'feed']

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
says(ui, line(ui, 'idle'))
tap_mascot(ui, element)
says(ui, line(ui, 'failed'))
ui.at_rest()
ui.capture('01-failed')
assert len(feeds(ui, 1)) == 1, 'the failed feed was not recorded'
time.sleep(5)
assert len(feeds(ui, 2, timeout=2)) == 1, 'the feed was resent on its own'
says(ui, line(ui, 'idle'))
tap_mascot(ui, element)
says(ui, line(ui, 'fed'))
sent = feeds(ui, 2)
assert len(sent) == 2, f'expected the second tap to send once: {sent}'
print('PASS: a failure says so, waits for the tap, and the tap feeds')
