"""273 A: the 貘币 page has a black 买貘币 pill right under the balance; it opens a sheet titled 买貘币 with the balance line,
the three packs from the server table (5, 11, 35, smallest first) priced by StoreKit, and the note that bought coins never
expire. Tapping RM 9.90 shows a spinner on that row and disables the other prices; the sheet reads 「11 貘币已到账」 only after
the server credited the purchase, StoreKit's transaction is finished after that answer, and the balance line reads 24.
Closed, the page reads 24 and its newest row is 买貘币 · 测试购买 +11."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import (PRICES, assert_packs, balance_label, coin_calls, label, open_page, open_sheet, row_ids,  # noqa: E402
                   row_prefix, sheet_balance, wait_status)
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/coins/', 'src/app/(tabs)/me/', 'src/app/buy-coins.tsx', 'src/app/_layout.tsx',
        'src/lib/i18n/locales/coins/', 'src/debug/CoinsScenes.tsx', 'verification/ui/coins.py', 'modules/tapiro-kit/index.tsx']
SCENE = 'coins-page'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyStoreDelayMs', '2500']

ui = UI(*sys.argv[1:])
open_page(ui)
buy = ui.element('coins-buy')
assert buy.get('AXLabel') == ui.t('coins.buy.action'), buy.get('AXLabel')
assert_touch_target(buy, '买貘币')
items = ui.read()
balance = by_id(items, 'coins-balance')['frame']
first_row = by_id(items, 'coins-row-9')
assert balance['y'] + balance['height'] <= buy['frame']['y'], '买貘币 is not under the balance'
assert first_row is None or buy['frame']['y'] < first_row['frame']['y'], '买貘币 is not above the history'
ui.at_rest()
ui.capture('01-page')

open_sheet(ui)
ui.wait_label('buy-coins-balance', lambda text: text == sheet_balance(ui, 13), 'the sheet balance line is wrong')
items = assert_packs(ui)
for coins in (5, 11, 35):
    assert_touch_target(by_id(items, f'buy-coins-buy-{coins}'), f'{coins} 貘币的价格')
assert ui.labelled(ui.t('coins.buy.note')) is not None
assert by_id(items, 'buy-coins-status') is None, 'a status shows before anything was bought'
ui.at_rest()
ui.capture('02-sheet')

ui.tap('buy-coins-buy-11')
ui.element('buy-coins-busy-11', timeout=10)
items = ui.read()
for other in (5, 35):
    assert by_id(items, f'buy-coins-buy-{other}').get('enabled') is False, f'{other} stays tappable while buying'
assert ui.t('coins.buy.succeeded', coins=11) not in (by_id(items, 'buy-coins-status') or {}).get('AXLabel', ''), \
    'the sheet says 到账 before the server answered'
ui.capture('03-buying')

wait_status(ui, 'coins.buy.succeeded', coins=11)
ui.wait_label('buy-coins-balance', lambda text: text == sheet_balance(ui, 24), 'the sheet balance never read 24')
verify = coin_calls(ui, 'verify', 1)
finish = coin_calls(ui, 'finish', 1)
assert len(verify) == 1 and len(finish) == 1, f'verify {verify}, finish {finish}'
assert coin_calls(ui, 'purchase', 1) == [{'productId': 'app.tapiro.coins.11'}]
ui.at_rest()
ui.capture('04-credited')

ui.tap_label(ui.t('coins.buy.close'))
ui.gone('buy-coins')
ui.wait_label('coins-balance', lambda text: text == balance_label(ui, 24, 2), 'the page balance never read 24')
ui.wait(lambda items: row_ids(items)[:1] == [5000], 'the purchase row never topped the history')
purchase_row = ui.t('coins.sandbox', reason=ui.t('coins.reason.purchase'))
assert label(ui, 'coins-row-5000').startswith(f'{purchase_row}{ui.t("coins.listJoin")}+11'), label(ui, 'coins-row-5000')
ui.at_rest()
ui.capture('05-page-after')
print(f'PASS: 买貘币 sits under the balance, the sheet lists {sorted(PRICES)} and credits only after the server')
