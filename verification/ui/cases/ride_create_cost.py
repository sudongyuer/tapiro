"""The fee line follows the balance (206 A default): with the free posts used it reads 「1 貘币 · 余额 4」 and the button
「用 1 貘币发出去」; with no coins it explains when the next free post comes and 发出去 is disabled; while publishing is
blocked by an unpaid debt it says so and 发出去 is disabled. 273 A: with no coins the three packs follow the notice
(not when blocked); buying 5 there turns the line into 「1 貘币 · 余额 5」 and 「用 1 貘币发出去」, enabled."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import tap_price, assert_packs  # noqa: E402
from driver import UI, by_id  # noqa: E402
from ride import open_confirm, open_list, relaunch_list  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/ride-create/', 'verification/ui/ride.py', 'src/features/coins/buy/',
        'src/features/coins/purchase/', 'src/lib/uiVerifyPurchases.ts', 'verification/ui/coins.py']
COIN = ['-uiVerifyRideCost', 'coin']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDraft', 'mall', '-uiVerifyRideCost', 'coin']

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
    if cost == 'none':
        ui.element('ride-confirm-packs-buy-5', timeout=30)
        items = assert_packs(ui, 'ride-confirm-packs')
        card = by_id(items, notice)['frame']
        assert card['y'] + card['height'] <= by_id(items, 'ride-confirm-packs-buy-5')['frame']['y'], 'packs not under the notice'
    else:
        assert by_id(ui.read(), 'ride-confirm-packs-buy-5') is None, 'packs show while publishing is blocked'
    ui.capture(f'02-{cost}')
    if cost == 'none':
        tap_price(ui, 'ride-confirm-packs-buy-5')
        ui.wait_label('ride-confirm-fee', lambda label: ui.t('ride.create.confirm.coin', balance=5) in label,
                      'the fee line never read the bought coins')
        ui.wait_label('ride-confirm-publish', lambda label: label == ui.t('ride.create.confirm.publishCoin'),
                      'the button never turned into 用 1 貘币发出去')
        assert by_id(ui.read(), 'ride-confirm-publish').get('enabled') is True
        ui.capture('03-bought')
print('PASS: coin line and label, no balance offers the packs, blocked disables 发出去')
