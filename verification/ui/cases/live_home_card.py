"""A live signal while a home card is on screen (spec 171 A): the poster's 帮取快递 card reads 等人申请, and it still reads
that while the verify emitter has not delivered its step. The step is recorded in uiVerifyLiveSteps with the
`-uiVerifyLiveRun` id the case relaunches with (the preferences file can lag and still hold the last launch). The
fixture answers the next state only for a load that starts 18 s or more after launch, so launch reloads cannot change
the card; once the bounty.applied step is delivered at 25 s, the live bounties reload without a pull or a foreground,
and the same card turns into 3 人申请，去选 with its 去选人 pill in front."""
import json
import sys
import uuid

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/lib/live/', 'src/features/bounty/live/', 'src/features/home/', 'src/app/(tabs)/_layout.tsx',
        'verification/ui/choose.py', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 180
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBountyLive', 'posterOpen',
        '-uiVerifyBountyLiveNext', 'posterApplicants', '-uiVerifyLive', '25000:bounty.applied:fixture-live-posterOpen']
STEP = 'bounty.applied:fixture-live-posterOpen'
RUN = uuid.uuid4().hex[:12]

ui = UI(*sys.argv[1:])


def delivered():
    text = defaults(ui, 'uiVerifyLiveSteps')
    try:
        value = json.loads(text) if text else {}
    except ValueError:
        return None
    return value.get('steps', []) if isinstance(value, dict) and value.get('run') == RUN else None


def stage(items):
    found = by_id(items, 'home-stage-live')
    return (found or {}).get('AXLabel') or ''


relaunch(ui, drop=[], add=['-uiVerifyLiveRun', RUN])
ui.wait(lambda items: delivered() is not None or None, 'the steps of this launch were never recorded')
before = ui.t('home.say.bounty', title='帮取快递', line=ui.t('bounty.live.poster.open'))
ui.wait(lambda items: stage(items) == before or None, f'the stage never read {before!r}: {stage(ui.read())!r}')
items = ui.read()
assert STEP not in delivered(), 'home settled after the signal, too late to tell the change apart'
assert by_id(items, 'live-card-bountyAction') is None, 'the card asks for a choice before the signal'
ui.capture('01-before-signal')

ui.wait(lambda items: STEP in (delivered() or []) or None, f'the emitter never delivered {STEP}', timeout=40)
after = ui.t('home.say.bounty', title='帮取快递', line=ui.tn('bounty.live.poster.applicants', 3))
ui.wait(lambda items: stage(items) == after or None, 'the signal did not change the card on screen', timeout=30)
ui.settled(lambda items: by_id(items, 'live-card-bountyAction'), 'the card did not turn into 去选人')
ui.at_rest()
ui.capture('02-after-signal')
print('PASS: the home card changes from 等人申请 to 3 人申请，去选 after the recorded live signal')
