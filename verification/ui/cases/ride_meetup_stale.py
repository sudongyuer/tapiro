"""The disconnected line at 集合 (172 B, 175 B, 199 A). The first load succeeds and nothing says 「可能不是最新」; within
15 minutes of departure the screen polls every 15 s, the next load fails, and the 集合 step shows 「可能不是最新 · hh:mm
的」 with the time of the last good load while the arrival row stays on screen."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py']
SCENE = 'ride-detail'
BUDGET = 180
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'meetup',
        '-uiVerifyRideDetailFail', 'refresh']
POLL_S = 15

ui = UI(*sys.argv[1:])
ui.element('ride-detail-arrivals')
assert by_id(ui.read(), 'ride-detail-live-stale') is None, '可能不是最新 shows before any load failed'
ui.wait_label('ride-detail-live-stale',
              lambda label: re.fullmatch(ui.pattern('ride.detail.staleLive', time=r'\d{2}:\d{2}'), label or ''),
              'the poll never failed into 「可能不是最新」', timeout=POLL_S * 3)
assert by_id(ui.read(), 'ride-detail-arrival-fixture-ride-xiaolin'), 'the arrival row went away with the failed poll'
ui.at_rest()
ui.capture('01-stale')
print('PASS: no line while loads succeed, 可能不是最新 after a failed poll, the last row kept')
