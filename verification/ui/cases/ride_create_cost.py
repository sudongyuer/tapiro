"""The fee line follows the balance (206 A default): with the free posts used it reads 「1 貘币 · 余额 4」 and the button
「用 1 貘币发出去」; with no coins it explains when the next free post comes and 发出去 is disabled; while publishing is
blocked by an unpaid debt it says so and 发出去 is disabled."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from ride import open_confirm, open_list, relaunch_list  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/ride-create/', 'verification/ui/ride.py']
COIN = ['-uiVerifyRideCost', 'coin']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDraft', 'mall', *COIN]

ui = UI(*sys.argv[1:])
open_list(ui)
open_confirm(ui)
ui.wait_label('ride-confirm-fee', lambda label: ui.t('ride.create.confirm.coin', balance=4) in label,
              'the coin fee line is missing')
ui.wait_label('ride-confirm-publish', lambda label: label == ui.t('ride.create.confirm.publishCoin'),
              'the coin publish label is wrong')
ui.capture('01-coin')

for cost, notice in (('none', 'ride-confirm-no-balance'), ('blocked', 'ride-confirm-blocked')):
    relaunch_list(ui, drop=COIN, add=['-uiVerifyRideCost', cost])
    open_confirm(ui)
    ui.element(notice)
    publish = ui.element('ride-confirm-publish')
    assert publish.get('enabled') is False, f'发出去 is enabled with cost {cost}'
    assert by_id(ui.read(), 'ride-confirm-add-payee') is None
    ui.capture(f'02-{cost}')
print('PASS: coin line and label, no balance and blocked disable 发出去')
