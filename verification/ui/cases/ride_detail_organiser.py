"""The organiser's detail before and at 集合 (190 A, 223, the old spec's cancel ruling). The 「⋯」 menu offers 改出发时间,
车牌和集合说明 and 取消这趟; 取消这趟 with a member aboard says the posting fee is not refunded and 不取消 sends nothing.
车费怎么分 reads Tapiro 平分 with the 「出发前都能改」 line, and 集合说明 has 编辑. With one seat empty inside T-15 the ride
asks 「还差 1 人，照常走还是取消？」; 照常走 hides the prompt and sends nothing."""
import json
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch, tap_sheet_action  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py', 'src/features/block/']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'organiser']
CALLS = 'uiVerifyRideDetailCalls'

ui = UI(*sys.argv[1:])


def sent():
    text = defaults(ui, CALLS)
    return json.loads(text) if text else []


ui.element('ride-detail-ticket')
ui.labelled(ui.t('ride.detail.split.title'))
ui.labelled(ui.t('ride.detail.split.footer'))
ui.element('ride-detail-note-edit')
ui.tap_label(ui.t('ride.detail.more'))
for key in ('reviseTime', 'editDetails', 'cancel'):
    ui.labelled(ui.t(f'ride.detail.menu.{key}'))
ui.capture('01-menu')
ui.tap_label(ui.t('ride.detail.menu.cancel'))
ui.labelled(ui.t('ride.detail.cancel.title'))
ui.labelled(ui.t('ride.detail.cancel.members'))
tap_sheet_action(ui, ui.t('ride.detail.cancel.keep'), 'ride-detail-ticket')
time.sleep(1.0)  # a stray cancel would reach the plist within this
assert not [c for c in sent() if c['name'] == 'cancel'], 'cancel was sent after 不取消'

relaunch(ui, drop=['-uiVerifyRideDetail', 'organiser'],
         add=['-uiVerifyRideDetail', 'goOrCancel', '-uiVerifyScene', SCENE], ready='ride-detail-ticket')
ui.wait(lambda items: by_id(items, 'ride-detail-go'), '照常走还是取消 never showed', timeout=60 * 6)
ui.labelled(ui.tn('ride.detail.goOrCancel.title', 1))
ui.capture('02-go-or-cancel')
ui.tap('ride-detail-go')
ui.gone('ride-detail-go')
assert not sent(), f'照常走 sent {sent()}'
print('PASS: organiser menu, cancel asks first, split row, 照常走还是取消')
