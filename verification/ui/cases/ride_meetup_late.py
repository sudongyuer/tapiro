"""晚到 for a member at 集合 (196 A, 228). 晚到 opens the system menu with 晚到 5 / 10 / 15 分钟 and 不来了…; 晚到 5 分钟
sends report_ride_late once with 5 and your avatar reads 晚到 5 分; the menu then offers 不晚到了, which clears it.
不来了… asks with the system action sheet that leaving now counts as a no-show (the ride leaves in 10 minutes) and that
the first in 60 days does not count; 不退出 sends nothing."""
import json
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import tap_sheet_action  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py']
SCENE = 'ride-detail'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'meetup']
CALLS = 'uiVerifyRideDetailCalls'
SELF = '00000000-0000-4000-8000-000000000001'

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


ui.tap('ride-detail-late')
for minutes in (5, 10, 15):
    ui.labelled(ui.tn('ride.detail.meetup.lateMinutes', minutes))
ui.labelled(ui.t('ride.detail.meetup.notComing'))
ui.capture('01-menu')
ui.tap_label(ui.tn('ride.detail.meetup.lateMinutes', 5))
assert wait_calls('late', 1)[0]['args']['minutes'] == 5
you = ui.t('ride.detail.you')
ui.wait_label(f'ride-detail-arrival-{SELF}',
              lambda label: label == ui.t('ride.detail.arrival.a11y', name=you, state=ui.tn('ride.detail.arrival.late', 5)),
              'your avatar never read 晚到 5 分')
ui.at_rest()
ui.capture('02-late')

ui.tap('ride-detail-late')
ui.tap_label(ui.t('ride.detail.meetup.lateClear'))
assert wait_calls('late', 2)[1]['args']['minutes'] is None
ui.wait_label(f'ride-detail-arrival-{SELF}',
              lambda label: label == ui.t('ride.detail.arrival.a11y', name=you, state=ui.t('ride.detail.arrival.waiting')),
              '晚到 was never cleared')

ui.tap('ride-detail-late')
ui.tap_label(ui.t('ride.detail.meetup.notComing'))
ui.labelled(ui.t('ride.detail.leave.title'))
ui.labelled(ui.t('ride.detail.noShow.counts') + ui.t('ride.detail.noShow.waiver'))
ui.capture('03-leave')
tap_sheet_action(ui, ui.t('ride.detail.leave.keep'), 'ride-detail-late')
time.sleep(1.0)  # a stray leave would reach the plist within this
assert not calls('leave'), 'leave was sent after 不退出'
print('PASS: 晚到 menu, 5 minutes, clear, and 不来了… asks before leaving')
