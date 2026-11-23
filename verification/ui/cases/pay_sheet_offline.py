"""With no network the payer's sheet says 没有网络 at the top, 我已付款 and 付不了 are off, and choosing a method, the number and its copy button still work."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from pay import open_sheet, scroll_to  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'src/lib/network/', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayMethods', 'duitnow', '-uiVerifyOffline', '1']
LOCALES = ['zh-Hans', 'ms']


def off(ui, identifier):
    element = ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled')
    return element.get('enabled') is False


ui = UI(*sys.argv[1:])
open_sheet(ui)
notice = ui.wait_label('pay-offline', lambda label: ui.t('pay.sheet.offline.title') in label, '没有网络 not shown')
assert ui.t('pay.sheet.offline.body') in (notice.get('AXLabel') or ''), notice.get('AXLabel')
assert notice['frame']['y'] < ui.element('pay-amount')['frame']['y'], '没有网络 is not above the amount'
assert off(ui, 'pay-mark-paid'), '我已付款 is on without a network'
assert not off(ui, 'pay-number-copy'), 'copying the number is off without a network'
ui.capture('01-payer-offline')
scroll_to(ui, 'pay-cant-pay')
assert off(ui, 'pay-cant-pay'), '付不了 is on without a network'
ui.capture('02-cant-pay-off')
print('PASS: offline payer sheet keeps reading and copying, and turns writes off')
