"""Entry from a ride (247 A): before departure the organiser line 由小林发起 · 靠谱 is a 44 pt button with a chevron that pushes
小林's profile in the 拼车 tab and returns with the line deselected; the organiser's join request row names 阿杰 as a button
that pushes 阿杰's profile, while 同意 and 拒绝 stay separate buttons."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, assert_touch_target, by_id, close  # noqa: E402
from profile import open_profile, rep_calls  # noqa: E402

DEPS = ['src/features/ride/detail/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py', 'src/features/reputation/profile/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
SCENE = 'ride-detail'
BUDGET = 240
CELL = {'light': (255, 255, 255), 'dark': (28, 28, 30)}
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'viewer']

ui = UI(*sys.argv[1:])
line = ui.element('ride-detail-organiser', timeout=45)
assert line.get('AXLabel') == ui.t('ride.detail.steps.by', name='小林', tier=ui.t('bounty.tier.reliable'))
assert line.get('type') == 'Button', line.get('type')
assert_touch_target(line, '发起人那行')
ui.at_rest()
ui.capture('01-viewer')
ui.tap('ride-detail-organiser')
open_profile(ui)
assert [call['personId'] for call in rep_calls(ui, 'profile', 1)] == ['fixture-ride-xiaolin']
ui.tap('BackButton')
ui.gone('profile-screen')
ui.element('ride-detail-organiser')
ui.at_rest()
shot = ui.snap('02-back')
f = by_id(ui.read(), 'ride-detail-organiser')['frame']
fill = shot.rgb(f['x'] + f['width'] * 0.8, f['y'] + f['height'] / 2)
assert close(fill, CELL[ui.appearance], 8), f'the organiser line stays highlighted: {fill}'

relaunch(ui, drop=['-uiVerifyRideDetail', 'viewer'], add=['-uiVerifyRideDetail', 'organiser', '-uiVerifyScene', SCENE],
         ready='ride-detail-ticket')
request = ui.element('ride-detail-request-name-fixture-ride-ajie', timeout=30)
assert request.get('type') == 'Button', request.get('type')
items = ui.read()
for button in ('ride-detail-approve-fixture-ride-ajie', 'ride-detail-decline-fixture-ride-ajie'):
    assert by_id(items, button) is not None, f'{button} is gone'
ui.at_rest()
ui.capture('03-organiser')
ui.tap('ride-detail-request-name-fixture-ride-ajie')
open_profile(ui)
assert 'fixture-ride-ajie' in [call['personId'] for call in rep_calls(ui, 'profile', 1)]
ui.at_rest()
ui.capture('04-profile')
print('PASS: the organiser line and the request names push profiles in the ride tab')
