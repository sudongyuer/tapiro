"""254 A: a level-up and an open week together: 我长大了 speaks first and the first tap opens the moment and feeds nothing;
back on home the invitation speaks and the next tap feeds."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, reach_home  # noqa: E402
from feed import feeds, line  # noqa: E402
from mascot import GROWN, says, stage, tap_mascot  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/home/', 'src/ui/MascotStage.tsx', 'src/ui/MascotStageParts.tsx', 'src/lib/i18n/locales/coins/', 'src/app/(tabs)/bounty/', 'verification/ui/feed.py', 'verification/ui/mascot.py', 'verification/ui/recording.py']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'many', '-uiVerifyMascot', 'levelUp']

ui = UI(*sys.argv[1:])
reach_home(ui)
element = stage(ui)
says(ui, ui.t('reputation.level.grewUp'))
ui.at_rest()
ui.capture('01-level-first')
tap_mascot(ui, element)
ui.element(GROWN, timeout=20)
assert not feeds(ui, 1, timeout=2), 'the level-up tap fed 小貘'
ui.tap('BackButton')
ui.gone(GROWN)
says(ui, line(ui, 'idle'))
ui.at_rest()
tap_mascot(ui, element)
says(ui, line(ui, 'fed'))
ui.capture('02-fed')
assert line(ui, 'fed') in (ui.output / '02-fed.json').read_text(), 'the shot missed the thanks'
assert len(feeds(ui, 1)) == 1, 'the second tap did not feed'
print('PASS: the level-up went first and the next tap fed')
