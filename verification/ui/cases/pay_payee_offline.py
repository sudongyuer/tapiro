"""With no network the payee's sheet says 没有网络 and both 已收到 and 还没收到 are off."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from pay import open_sheet  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'src/lib/network/', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayment', 'fixture-owed', '-uiVerifyOffline', '1']


def off(ui, identifier):
    element = ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled')
    return element.get('enabled') is False


ui = UI(*sys.argv[1:])
open_sheet(ui)
ui.wait_label('pay-offline', lambda label: ui.t('pay.sheet.offline.title') in label, '没有网络 not shown')
assert off(ui, 'pay-confirm'), '已收到 is on without a network'
assert off(ui, 'pay-not-received'), '还没收到 is on without a network'
ui.capture('01-payee-offline')
print('PASS: offline payee sheet turns 已收到 and 还没收到 off')
