"""A live signal while a home card is on screen (spec 171 A): the poster's 帮取快递 card reads 等人申请. The emitter and the
fixture live bounty service record, with times since launch and the `-uiVerifyLiveRun` id the case relaunches with,
each delivered step (uiVerifyLiveSteps) and each live bounty load that starts (uiVerifyBountyLiveLoads). The launch loads
once; no other load starts before the bounty.applied step, exactly one starts right after it, and that load turns the
same card into 3 人申请，去选 with its 去选人 pill in front, without a pull or a foreground."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, by_id  # noqa: E402
from live import new_run, starts, step_at  # noqa: E402

DEPS = ['src/lib/live/', 'src/lib/verifyRecord.ts', 'src/lib/foreground.ts', 'src/features/bounty/live/',
        'src/features/home/', 'src/app/(tabs)/_layout.tsx', 'verification/ui/live.py',
        'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 180
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBountyLive', 'posterOpen',
        '-uiVerifyBountyLiveNext', 'posterApplicants', '-uiVerifyLive', '15000:bounty.applied:fixture-live-posterOpen']
STEP = 'bounty.applied:fixture-live-posterOpen'
LOADS = 'uiVerifyBountyLiveLoads'
RUN = new_run()

ui = UI(*sys.argv[1:])


def stage(items):
    found = by_id(items, 'home-stage-live')
    return (found or {}).get('AXLabel') or ''


relaunch(ui, drop=[], add=['-uiVerifyLiveRun', RUN])
before = ui.t('home.say.bounty', title='帮取快递', line=ui.t('bounty.live.poster.open'))
ui.wait(lambda items: stage(items) == before or None, f'the stage never read {before!r}: {stage(ui.read())!r}')
assert by_id(ui.read(), 'live-card-bountyAction') is None, 'the card asks for a choice before the signal'
ui.capture('01-before-signal')

step = step_at(ui, RUN, STEP)
after = ui.t('home.say.bounty', title='帮取快递', line=ui.tn('bounty.live.poster.applicants', 3))
ui.wait(lambda items: stage(items) == after or None, 'the signal did not change the card on screen', timeout=30)
ui.settled(lambda items: by_id(items, 'live-card-bountyAction'), 'the card did not turn into 去选人')
ui.wait(lambda items: starts(ui, LOADS, RUN, since=step) or None, 'no load start was recorded after the signal')
assert len(starts(ui, LOADS, RUN, until=step)) == 1, \
    f'loads before the signal: {starts(ui, LOADS, RUN, until=step)} (only the launch load is expected)'
assert len(starts(ui, LOADS, RUN, since=step, until=step + 5000)) == 1, \
    f'the signal should start exactly one load: {starts(ui, LOADS, RUN, since=step)}'
ui.at_rest()
ui.capture('02-after-signal')
print('PASS: one launch load, then exactly one load after the recorded signal turns the card into 3 人申请，去选')
