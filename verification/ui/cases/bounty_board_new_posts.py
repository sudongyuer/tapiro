"""Bounties posted by someone else reach a board that is already on screen (spec Decisions "Freshness"): the board
opens empty (全部 0 · 附近暂时没有悬赏) and the fixture lists one bounty on every later load. A pull to refresh shows it
under 全部 1. After a relaunch with a short timed reload (`-uiVerifyBoardTickMs`, 60 s in the app), the same card
appears with no gesture at all."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402
from gestures import pull  # noqa: E402

DEPS = ['src/features/bounty/board/', 'src/app/(tabs)/bounty/', 'src/features/home/HomeScreen.tsx',
        'verification/ui/gestures.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBoard', 'empty',
        '-uiVerifyBoardLater', 'one']
CARD = 'bounty-card-fixture-bounty-04'

ui = UI(*sys.argv[1:])


def all_chip(items):
    return (by_id(items, 'bounty-filter-all') or {}).get('AXLabel') or ''


def starts_empty():
    items = ui.wait(lambda items: items if by_id(items, 'bounty-board-empty') else None, 'the board did not open empty')
    assert by_id(items, 'bounty-board-empty').get('AXLabel') == ui.t('bounty.board.state.empty')
    assert all_chip(items) == ui.t('bounty.board.filter.allCount', count=0), all_chip(items)


reach_home(ui)
starts_empty()
ui.capture('01-empty')
pull(ui, ui.read())
ui.settled(lambda items: by_id(items, CARD), 'a pull did not bring the new bounty')
ui.wait(lambda items: all_chip(items) == ui.t('bounty.board.filter.allCount', count=1) or None,
        f'全部 does not count the new bounty: {all_chip(ui.read())!r}')
assert by_id(ui.read(), 'bounty-board-empty') is None, 'the empty state stayed beside the new card'
ui.at_rest()
ui.capture('02-after-pull')

relaunch(ui, drop=[], add=['-uiVerifyBoardTickMs', '15000'])
starts_empty()
ui.settled(lambda items: by_id(items, CARD), 'the timed reload never brought the new bounty', timeout=45)
assert all_chip(ui.read()) == ui.t('bounty.board.filter.allCount', count=1), all_chip(ui.read())
ui.at_rest()
ui.capture('03-after-tick')
print('PASS: a pull and, with no gesture, the timed reload both show a bounty posted after the board opened')
