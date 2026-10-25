"""When payments fail to load, home shows 付款信息没加载出来 with 重试 instead of the calm card; 重试 loads them and the pay card appears."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402

DEPS = ['src/features/home/', 'src/features/payment/', 'src/app/(tabs)/']
ARGS = ['-uiVerifyShellFeed', 'oweMoney', '-uiVerifyPaymentsFail', '1', '-uiVerifySignedIn', 'onboarded']

ui = UI(*sys.argv[1:])
reach_home(ui)
card = ui.element('live-card-unavailable-failed')
assert '付款信息没加载出来' in (card.get('AXLabel') or ''), card.get('AXLabel')
items = ui.read()
assert by_id(items, 'live-card-calm') is None and by_id(items, 'home-stage-calm') is None, 'failure shown as calm'
retry = ui.element('live-card-unavailable-retry')
assert_touch_target(retry, '重试')
ui.capture('01-failed')
ui.tap('live-card-unavailable-retry')
ui.settled(lambda items: by_id(items, 'live-card-oweMoney'), 'pay card did not load after retry')
assert by_id(ui.read(), 'live-card-unavailable-failed') is None, 'failure card still shown'
ui.capture('02-loaded')
print('PASS: failed payments are not shown as calm, and retry loads them')
