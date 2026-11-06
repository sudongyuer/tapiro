"""Worst data (`-uiVerifyCoins worst`): 1,238 coins, no free posts left, 129 rows over three pages with long titles. The
balance reads with a thousands separator; a long title stays on one line inside the screen while VoiceOver reads it whole;
every month header reads its month (and its year outside this Malaysia year); scrolling to the end of the first page loads the next, and a
failed next page (`historyMore`) reads 「更早的明细没加载出来 · 重试」, which loads it, and rests clear of the minimised tab
bar at the end of the list."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import assert_month_labels, balance_label, label, open_page, row_ids, row_prefix  # noqa: E402
from driver import UI, by_id  # noqa: E402
from gestures import drag  # noqa: E402
from profile import assert_clears_tab_bar, within_width  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/account/MeView.tsx', 'src/app/(tabs)/me/', 'src/lib/i18n/locales/coins/', 'src/lib/loadable.ts', 'src/ui/NoticeCard.tsx', 'src/debug/CoinsScenes.tsx', 'verification/ui/coins.py', 'verification/ui/gestures.py', 'verification/ui/profile.py']
SCENE = 'coins-page'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'worst',
        '-uiVerifyCoinsFail', 'historyMore']
LONG = '帮忙从 Sunway Pyramid 带一份椰浆饭到 Sunway Geo Residences 的大堂，顺便买两杯拉茶'

ui = UI(*sys.argv[1:])
open_page(ui)
assert label(ui, 'coins-balance') == balance_label(ui, 1238, 0), label(ui, 'coins-balance')
items = ui.wait(lambda items: by_id(items, 'coins-row-2008') is not None, 'the long spend row never showed')
items = ui.read()
assert label(ui, 'coins-row-2008').startswith(row_prefix(ui, 'post_spend', -1, LONG)), label(ui, 'coins-row-2008')
within_width(items, 'coins-row-2008')
long_row = by_id(items, 'coins-row-2008')['frame']
short_row = by_id(items, 'coins-row-2009')['frame']
assert long_row['height'] <= short_row['height'] + 1, f'the long title wraps: {long_row} vs {short_row}'
balance = by_id(items, 'coins-balance')['frame']
within_width(items, 'coins-balance')
ui.at_rest()
ui.capture('01-top')

w, h = items[0]['frame']['width'], items[0]['frame']['height']
for _ in range(40):
    items = ui.read()
    if by_id(items, 'coins-more-retry') is not None:
        break
    drag(ui, (w / 2, h * 0.8), (w / 2, h * 0.2))
else:
    raise AssertionError(f'the next page never failed into view: {row_ids(ui.read())[-3:]}')
retry = by_id(ui.read(), 'coins-more-retry')
assert retry.get('AXLabel') == ui.t('coins.moreFailed') + ui.t('coins.listJoin') + ui.t('coins.retry'), retry.get('AXLabel')
assert 959 not in row_ids(ui.read())
assert_clears_tab_bar(ui, 'coins-more-retry')
ui.capture('02-more-failed')
ui.tap('coins-more-retry')
ui.wait(lambda items: by_id(items, 'coins-more-retry') is None, '重试 never loaded the next page')
for _ in range(6):
    if by_id(ui.read(), 'coins-row-959') is not None:
        break
    drag(ui, (w / 2, h * 0.7), (w / 2, h * 0.35))
assert len(assert_month_labels(ui, ui.read())) >= 1
ids = row_ids(ui.read())
assert 959 in ids and ids == sorted(ids, reverse=True), f'the next page did not follow in order: {ids}'
ui.at_rest()
ui.capture('03-next-page')
print('PASS: the worst history fits, pages on and recovers a failed page')
