"""bounty.flow.eta-overdue on home: the poster's 帮取快递 card for a helper whose arrival time passed seven minutes ago
reads 阿杰在路上 · 晚了 N 分钟 (N is 7, or 8 if the launch crossed a minute) instead of 阿杰在路上 · … 到. With home
left alone the count moves to N + 1 at the next minute of lateness, and the fixture live bounty service records that no
load started after the launch load (uiVerifyBountyLiveLoads), so the card was redrawn from the clock, not re-read."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, by_id  # noqa: E402
from live import new_run, starts  # noqa: E402

DEPS = ['src/features/bounty/live/', 'src/features/home/', 'src/lib/etaLate.ts', 'src/lib/verifyRecord.ts',
        'src/lib/i18n/locales/bounty/', 'verification/ui/live.py', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBountyLive', 'posterEnRouteLate']
LOADS = 'uiVerifyBountyLiveLoads'
RUN = new_run()

ui = UI(*sys.argv[1:])
LINE = ui.pattern('bounty.live.poster.enRouteLate_other', name='阿杰', count=r'(\d+)')
SAY = re.compile(ui.pattern('home.say.bounty', title='帮取快递', line='\x02').replace(re.escape('\x02'), LINE))


def count(items):
    found = SAY.fullmatch((by_id(items, 'home-stage-live') or {}).get('AXLabel') or '')
    return int(found.group(1)) if found else None


relaunch(ui, drop=[], add=['-uiVerifyLiveRun', RUN])
first = ui.wait(lambda items: count(items), 'the home card never said how late the arrival is', timeout=60)
assert first in (7, 8), f'the card counts {first} minutes late, expected 7 or 8'
ui.at_rest()
ui.capture('01-late')

ui.wait(lambda items: (count(items) or 0) > first or None, f'the card stayed at {first} minutes', timeout=75)
moved = count(ui.read())
assert moved == first + 1, f'the count jumped from {first} to {moved}'
loads = starts(ui, LOADS, RUN)
assert len(loads) == 1, f'the card should move without a read; loads started at {loads}'
ui.at_rest()
ui.capture('02-next-minute')
print(f'PASS: the home card reads 晚了 {first} 分钟 and moves to {moved} with only the launch load')
