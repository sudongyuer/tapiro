"""268 A: after a refund of bought coins that were already spent, the 貘币 page shows the balance −6 with one line of
reason (posting with coins waits until it is back above 0; free posts still work), still offers 买貘币, and the history
reads the purchase rows by their own names: 退款收回 · 测试购买 −35, 退款撤销，貘币退回 +11, 退款收回 −11, 买貘币 +11."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import label, open_page  # noqa: E402
from driver import UI  # noqa: E402
from profile import within_width  # noqa: E402

DEPS = ['src/features/coins/', 'src/app/(tabs)/me/', 'src/lib/i18n/locales/coins/', 'src/debug/CoinsScenes.tsx',
        'verification/ui/coins.py', 'verification/ui/profile.py']
SCENE = 'coins-page'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'refunded']

ui = UI(*sys.argv[1:])
open_page(ui)
join = ui.t('coins.listJoin')
expected = join.join([ui.tn('coins.balanceA11y', -6), ui.t('coins.freePosts', left=0, total=3), ui.t('coins.negative')])
ui.wait_label('coins-balance', lambda text: text == expected, 'the negative balance or its reason is missing')
within_width(ui.read(), 'coins-balance')
ui.element('coins-buy')


def title(reason, sandbox=False):
    name = ui.t(f'coins.reason.{reason}')
    return ui.t('coins.sandbox', reason=name) if sandbox else name


for row, reason, delta, sandbox in [(20, 'purchase_refund', '−35', True), (18, 'purchase_refund_reversed', '+11', False),
                                    (17, 'purchase_refund', '−11', False), (16, 'purchase', '+11', False)]:
    found = label(ui, f'coins-row-{row}')
    assert found.startswith(f'{title(reason, sandbox)}{join}{delta}{join}'), f'row {row} reads {found!r}'
ui.at_rest()
ui.capture('01-negative')
print('PASS: a negative balance shows its reason and the purchase rows read their names')
