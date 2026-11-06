"""251 A: 我的 shows 「貘币 13」 right under 一起办成的事 and pushes the 貘币 page: the balance, 「本月免费发布还剩 2 条（共 3 条）」
and the history grouped by month, this month first and the newest row on top; a spend reads its reason and the bounty
title; back returns to 我的 with the row deselected."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import assert_month_labels, balance_label, label, month, month_ids, open_page, row_ids, row_prefix  # noqa: E402
from driver import UI, assert_touch_target, by_id, close, reach_home  # noqa: E402
from gestures import drag  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/account/MeView.tsx', 'src/app/(tabs)/me/', 'src/lib/i18n/locales/coins/', 'src/lib/loadable.ts', 'src/ui/NoticeCard.tsx', 'src/debug/CoinsScenes.tsx', 'verification/ui/coins.py']
CELL = {'light': (255, 255, 255), 'dark': (28, 28, 30)}
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']

ui = UI(*sys.argv[1:])
reach_home(ui)
ui.tap('tab-me')
row = ui.element('me-coins', timeout=30)
ui.wait_label('me-coins', lambda text: '13' in text, 'the 貘币 row never showed the balance')
items = ui.read()
coins = by_id(items, 'me-coins')
assert ui.t('coins.row') in (coins.get('AXLabel') or ''), coins.get('AXLabel')
assert coins.get('type') == 'Button', coins.get('type')
assert_touch_target(coins, '貘币那行')
stickers = by_id(items, 'me-stickers')['frame']
assert 0 < coins['frame']['y'] - stickers['y'] <= stickers['height'] + 1, '貘币 is not right under 一起办成的事'
ui.at_rest()
ui.capture('01-me')

ui.tap('me-coins')
open_page(ui)
assert label(ui, 'coins-balance') == balance_label(ui, 13, 2), label(ui, 'coins-balance')
ui.wait(lambda items: len(row_ids(items)) >= 3, 'the history never showed')
items = ui.read()
assert month_ids(items)[:1] == [month(0)], f'months read {month_ids(items)}'
assert_month_labels(ui, items)
ids = row_ids(items)
assert ids == sorted(ids, reverse=True) and ids[0] == 9, f'rows are not newest first: {ids}'
assert label(ui, 'coins-row-9').startswith(row_prefix(ui, 'weekly_feed', 1)), label(ui, 'coins-row-9')
assert label(ui, 'coins-row-8').startswith(row_prefix(ui, 'post_spend', -1, '帮取快递')), label(ui, 'coins-row-8')
assert by_id(items, 'coins-failed') is None and by_id(items, 'coins-empty') is None
balance = by_id(items, 'coins-balance')['frame']
assert balance['y'] < by_id(items, 'coins-row-9')['frame']['y'], 'the balance is not above the history'
ui.at_rest()
ui.capture('02-page')

w, h = items[0]['frame']['width'], items[0]['frame']['height']
drag(ui, (w / 2, h * 0.75), (w / 2, h * 0.3))
ui.wait(lambda items: month(1) in month_ids(items), 'last month never showed')
items = ui.read()
assert by_id(items, 'coins-row-1') is not None or by_id(items, 'coins-row-2') is not None, row_ids(items)
assert row_ids(items) == sorted(row_ids(items), reverse=True), row_ids(items)
ui.at_rest()
ui.capture('03-last-month')

ui.tap('BackButton')
ui.gone('coins-screen')
ui.element('me-coins')
ui.at_rest()
shot = ui.snap('04-back')
f = by_id(ui.read(), 'me-coins')['frame']
fill = shot.rgb(f['x'] + f['width'] * 0.5, f['y'] + f['height'] / 2)
assert close(fill, CELL[ui.appearance], 8), f'the 貘币 row stays highlighted: {fill}'
print('PASS: 我的 shows the balance and the 貘币 page lists the history by month')
