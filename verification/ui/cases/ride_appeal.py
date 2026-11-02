"""Appeals after 出发 (197 A, 233 A). An unticked member reads 你没被勾上车 with the 72 h deadline and 我上车了; tapping it
sends appeal_ride_no_show once and the card turns into 申诉中 with the same deadline. A lapsed appeal reads 申诉过期了 and
that the no-show counts, with no button. A boarded member sees 「阿杰说已经上车了」 with 确认上车了; tapping it sends
confirm_ride_appeal once for 阿杰 and the card goes."""
import json
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py', 'src/ui/PillButton.tsx']
SCENE = 'ride-detail'
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'appealOpen']
CALLS = 'uiVerifyRideDetailCalls'
CLOCK = r'\d{2}:\d{2}'

ui = UI(*sys.argv[1:])


def calls(name):
    text = defaults(ui, CALLS)
    return [call for call in (json.loads(text) if text else []) if call['name'] == name]


def wait_calls(name, count, timeout=15):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline and len(calls(name)) < count:
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
    assert len(calls(name)) == count, f'{name} sent {len(calls(name))} times, expected {count}'
    return calls(name)


def switch(scene):
    relaunch(ui, drop=['-uiVerifyRideDetail', 'appealOpen'],
             add=['-uiVerifyRideDetail', scene, '-uiVerifyScene', SCENE], ready='ride-detail-ticket')


ui.labelled(ui.t('ride.detail.appeal.canTitle'))
body = ui.wait(lambda items: next((i for i in items if re.fullmatch(
    ui.pattern('ride.detail.appeal.canBody', time=CLOCK), i.get('AXLabel') or '')), None), 'the deadline line is missing')
assert body
ui.capture('01-can-appeal')
ui.tap('ride-detail-appeal')
ui.labelled(ui.t('ride.detail.appeal.pendingTitle'))
wait_calls('appeal', 1)
assert by_id(ui.read(), 'ride-detail-appeal') is None, '我上车了 is still shown while the appeal waits'
ui.capture('02-pending')

switch('appealLapsed')
ui.labelled(ui.t('ride.detail.appeal.lapsedTitle'))
ui.labelled(ui.t('ride.detail.appeal.lapsedCounted'))
assert by_id(ui.read(), 'ride-detail-appeal') is None, 'a lapsed appeal cannot be made again'
ui.capture('03-lapsed')

switch('confirmAppeal')
ui.labelled(ui.t('ride.detail.appeal.confirmTitle', name='阿杰'))
ui.tap('ride-detail-confirm-appeal-fixture-ride-ajie')
ui.gone('ride-detail-confirm-appeal-fixture-ride-ajie')
assert wait_calls('confirmAppeal', 1)[0]['args']['member'] == 'fixture-ride-ajie'
ui.capture('04-confirmed')
print('PASS: 我上车了, 申诉中, 申诉过期了 and a boarded member confirms')
