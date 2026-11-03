"""A live signal while a home card is on screen (spec 171 A): the poster's 帮取快递 card reads 等人申请; the
bounty.applied signal from the verify emitter at 15 s reloads the live bounties without a pull or a foreground, and
the same card turns into 3 人申请，去选 with its 去选人 pill in front."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/lib/live/', 'src/features/bounty/live/', 'src/features/home/', 'src/app/(tabs)/_layout.tsx']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 180
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBountyLive', 'posterOpen',
        '-uiVerifyBountyLiveNext', 'posterApplicants', '-uiVerifyLive', '15000:bounty.applied:fixture-live-posterOpen']
SIGNAL_AT = 15

started = time.monotonic()
ui = UI(*sys.argv[1:])


def stage(items):
    found = by_id(items, 'home-stage-live')
    return (found or {}).get('AXLabel') or ''


reach_home(ui)
before = ui.t('home.say.bounty', title='帮取快递', line=ui.t('bounty.live.poster.open'))
ui.wait(lambda items: stage(items) == before or None, f'the stage never read {before!r}')
elapsed = time.monotonic() - started
assert elapsed < SIGNAL_AT - 1, f'home settled {elapsed:.1f} s after launch, too late to tell the signal apart'
assert by_id(ui.read(), 'live-card-bountyAction') is None, 'the card asks for a choice before the signal'
ui.capture('01-before-signal')

after = ui.t('home.say.bounty', title='帮取快递', line=ui.tn('bounty.live.poster.applicants', 3))
ui.wait(lambda items: stage(items) == after or None, 'the signal did not change the card on screen', timeout=40)
ui.settled(lambda items: by_id(items, 'live-card-bountyAction'), 'the card did not turn into 去选人')
ui.at_rest()
ui.capture('02-after-signal')
print('PASS: the home card changes from 等人申请 to 3 人申请，去选 on a live signal')
