"""With no methods, 收款方式 says 还没有收款方式; turning on 现金当面付 replaces it with 还没有转账方式, because cash is a way to
receive money (owner's device report: the page kept saying 还没有收款方式 after cash was on). The toggle is the only cash
control and carries the pay sheet's name for it."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from payee import CASH, open_payee  # noqa: E402

DEPS = [
    'src/features/payee/',
    'src/app/(tabs)/me/',
    'verification/ui/payee.py',
]

LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyFixture', 'empty', '-uiVerifySignedIn', 'onboarded']

ui = UI(*sys.argv[1:])
open_payee(ui)
empty = ui.element('payee-empty')
assert ui.t('payee.emptyTitle') in (empty.get('AXLabel') or ''), empty.get('AXLabel')
cash = ui.element('payee-cash')
assert_touch_target(cash, 'payee-cash')
assert ui.t(CASH) in (cash.get('AXLabel') or ''), f'cash toggle is not named {ui.t(CASH)!r}: {cash.get("AXLabel")!r}'
assert str(cash.get('AXValue')) == '0', f'cash starts {cash.get("AXValue")}'
ui.capture('01-empty')

ui.flip('payee-cash')
items = ui.wait(lambda items: str((by_id(items, 'payee-cash') or {}).get('AXValue')) == '1'
                and by_id(items, 'payee-cash-only') and items, 'cash did not turn on with the cash-only line')
only = by_id(items, 'payee-cash-only')
assert ui.t('payee.cashOnly.title') in (only.get('AXLabel') or ''), only.get('AXLabel')
assert by_id(items, 'payee-empty') is None, '还没有收款方式 is still shown with cash on'
ui.capture('02-cash-only')
print('PASS: cash on is not reported as no payment methods')
