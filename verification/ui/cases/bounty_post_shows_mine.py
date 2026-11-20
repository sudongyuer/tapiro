"""The poster sees what they sent (22A, 57A): home starts calm (今天没有待处理的事), and once 发出去 closes the sheet the
live list is fetched again, so the front card turns into the poster's 帮取快递 · 等人申请 card under 等对方 without a pull, a
foreground or a relaunch. The fixture live service returns no rows on the launch load and the open bounty on any later
load, so the card can only appear through a reload that the publish starts."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import open_confirm, publish_and_close  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/bounty/post/', 'src/features/bounty/live/', 'src/features/home/', 'src/app/bounty-post/',
        'src/app/(tabs)/bounty/', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBountyDraft', 'demo',
        '-uiVerifyPostCost', 'free', '-uiVerifyBountyLive', 'none', '-uiVerifyBountyLiveNext', 'posterOpen']

ui = UI(*sys.argv[1:])


def stage(items):
    found = next((i for i in items if (i.get('AXUniqueId') or '').startswith('home-stage-')), None)
    return found or {}


ui.settled(lambda items: by_id(items, 'live-card-calm'), 'home did not start on the calm card')
assert by_id(ui.read(), 'live-card-waitingConfirm') is None, 'a waiting card shows before anything was sent'
ui.capture('01-calm-before')

open_confirm(ui)
publish_and_close(ui)

line = ui.t('home.say.bounty', title='帮取快递', line=ui.t('bounty.live.poster.open'))
ui.wait(lambda items: stage(items).get('AXLabel') == line or None,
        f'the stage never read {line!r} after publishing: {stage(ui.read())}', timeout=20)
card = ui.settled(lambda items: by_id(items, 'live-card-waitingConfirm'), 'the poster card never replaced calm')
assert by_id(ui.read(), 'live-card-calm') is None, 'the calm card is still on home after publishing'
label = card.get('AXLabel') or ''
assert ui.t('bounty.live.poster.open') in label, f'the card does not read 等人申请: {label!r}'
assert stage(ui.read()).get('AXUniqueId') == 'home-stage-live', f'the stage is not live: {stage(ui.read())}'
ui.at_rest()
ui.capture('02-mine-after')
print('PASS: home is calm before, and 发出去 brings the poster card 等人申请 to the front without a pull')
