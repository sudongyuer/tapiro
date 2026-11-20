"""A payment that no longer exists says 这笔付款已不存在 with no 重试, since a retry can never find it."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/payment/PaySheet.tsx', 'src/features/payment/hooks.ts', 'src/app/pay/']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayment', 'fixture-gone']

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
card = ui.element('pay-missing')
assert ui.t('pay.sheet.missing') in (card.get('AXLabel') or ''), card.get('AXLabel')
items = ui.read()
assert by_id(items, 'pay-retry') is None and by_id(items, 'pay-load-failed') is None, 'a missing payment offers a retry'
ui.capture('01-missing')
print('PASS: a missing payment is named, not retried')
