"""A failed load is never 0 or empty. With the balance failing once (`-uiVerifyCoinsFail balance,history`), 我的 shows
「貘币」 with no number; the page's first history read fails too and shows 「没加载出来」 with 重试 and no 还没有明细; 重试
loads it, and no read repeats on its own (every fixture call takes 1 s, and the checks wait past it). A failed pull to refresh (`historyAgain`) keeps the rows with 「没刷新成功 ·
下面是上次加载的貘币」 and 重试, which brings them back to current."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from coins import SCENE, coin_calls, label, open_page, row_ids  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402
from gestures import pull  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/account/MeView.tsx', 'src/app/(tabs)/me/', 'src/lib/i18n/locales/coins/', 'src/lib/loadable.ts', 'src/ui/NoticeCard.tsx', 'src/debug/CoinsScenes.tsx', 'verification/ui/coins.py', 'verification/ui/gestures.py', 'verification/ui/bounty.py']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoinsFail', 'balance,history',
        '-uiVerifyCoinsDelayMs', '1000']

ui = UI(*sys.argv[1:])
reach_home(ui)
ui.tap('tab-me')
ui.element('me-coins', timeout=30)
assert coin_calls(ui, 'balance', 1, timeout=15), 'the 我的 tab never read the balance'
time.sleep(4)  # past the 1 s fixture delay: the answer has landed, so an empty row is the failure, not loading
assert label(ui, 'me-coins') == ui.t('coins.row'), f'the row shows a balance it does not have: {label(ui, "me-coins")}'
ui.at_rest()
ui.capture('01-me-failed')

ui.tap('me-coins')
ui.element('coins-failed', timeout=45)
items = ui.read()
assert ui.t('coins.failed') in (by_id(items, 'coins-failed').get('AXLabel') or '')
assert by_id(items, 'coins-empty') is None and not row_ids(items), 'a failed history reads as empty'
assert coin_calls(ui, 'history', 1, timeout=10)
time.sleep(2)  # a replay would follow the failed answer
assert len(coin_calls(ui, 'history', 2, timeout=2)) == 1, 'the failed read was repeated on its own'
ui.at_rest()
ui.capture('02-failed')
ui.tap('coins-retry')
ui.wait(lambda items: len(row_ids(items)) >= 3, '重试 never loaded the history')
assert by_id(ui.read(), 'coins-failed') is None
ui.at_rest()
ui.capture('03-retried')

relaunch(ui, drop=['-uiVerifyCoinsFail', 'balance,history'],
         add=['-uiVerifyCoinsFail', 'historyAgain', '-uiVerifyScene', SCENE], ready='coins-screen')
open_page(ui)
ui.wait(lambda items: len(row_ids(items)) >= 3, 'the history never showed')
pull(ui, ui.read())
ui.element('coins-stale', timeout=30)
items = ui.read()
assert ui.t('coins.stale') in (by_id(items, 'coins-stale').get('AXLabel') or '')
assert len(row_ids(items)) >= 3, 'a failed refresh dropped the shown history'
ui.at_rest()
ui.capture('04-stale')
ui.tap('coins-stale-retry')
ui.gone('coins-stale', timeout=30)
assert row_ids(ui.read()), 'the history went away after 重试'
ui.at_rest()
ui.capture('05-current')
print('PASS: a failed load is never 0 or empty, a failed refresh is marked stale, 重试 recovers')
