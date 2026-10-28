"""The board under home shows 没加载出来 with no count on the chips and 重试 loads the rows; an empty board offers 发悬赏, which opens the post sheet; a failed pull to refresh keeps the rows under a warning with the data time, and its 重试 recovers; an empty 急 filter offers 看全部; the end of the list reads 就这些了. Inline cards sit on the grouped background with a head of at most 32 pt."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, assert_touch_target, by_id, close, reach_home  # noqa: E402

DEPS = ['src/features/bounty/', 'src/features/home/', 'src/app/(tabs)/', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
FAIL_FIRST = ['-uiVerifyBoardFail', 'first']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBoardFail', 'first']
FIRST_CARD = 'bounty-card-fixture-bounty-01'
ONE_CARD = 'bounty-card-fixture-bounty-04'
CARD_FILL = {'light': (255, 255, 255), 'dark': (28, 28, 30)}
BEHIND_CARD = {'light': (242, 242, 247), 'dark': (0, 0, 0)}
HEAD_MAX = 32

ui = UI(*sys.argv[1:])


def screen(items):
    return items[0]['frame']


def visible(identifier, tries=8):
    for _ in range(tries):
        items = ui.read()
        found, s = by_id(items, identifier), screen(items)
        if found and found['frame']['y'] >= 120 and found['frame']['y'] + found['frame']['height'] <= s['height'] - 110:
            return ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled')
        ui.swipe((s['width'] / 2, s['height'] * 0.72), (s['width'] / 2, s['height'] * 0.4), 0.4)
    raise AssertionError(f'{identifier} never scrolled into view')


def chip(identifier):
    return (ui.element(identifier) or {}).get('AXLabel') or ''


def assert_inline_card(shot, message, name):
    f = message['frame']
    y = f['y'] + f['height'] / 2
    behind, fill = shot.rgb(f['x'] - 24, y), shot.rgb(f['x'] - 6, y)
    assert close(behind, BEHIND_CARD[ui.appearance]) and not close(behind, fill), \
        f'{name}: behind the card is {behind}, not the grouped background {BEHIND_CARD[ui.appearance]}'
    assert close(fill, CARD_FILL[ui.appearance]), f'{name}: card fill is {fill}, expected {CARD_FILL[ui.appearance]}'
    x0, x1 = round((f['x'] - 2) * shot.scale), round((f['x'] + HEAD_MAX + 8) * shot.scale)
    y0, y1 = round(f['y'] * shot.scale), round((f['y'] + f['height']) * shot.scale)
    xs, ys = [], []
    for py in range(y0, y1):
        for px in range(x0, x1):
            if not close(shot._px(px, py), fill, 20):
                xs.append(px)
                ys.append(py)
    assert xs, f'{name}: no 小貘 head drawn in the card'
    width, height = (max(xs) - min(xs) + 1) / shot.scale, (max(ys) - min(ys) + 1) / shot.scale
    print(f'{name}: head {width:.1f} x {height:.1f} pt')
    assert 16 <= max(width, height) <= HEAD_MAX + 1, f'{name}: head is {width:.1f} x {height:.1f} pt, not ≤ {HEAD_MAX}'


reach_home(ui)
failed = visible('bounty-board-failed')
assert failed.get('AXLabel') == ui.t('bounty.board.state.failed'), failed.get('AXLabel')
assert chip('bounty-filter-all') == ui.t('bounty.board.filter.all'), f'全部 chip shows a count after a failed load: {chip("bounty-filter-all")}'
assert by_id(ui.read(), 'bounty-board-empty') is None, 'a failed load is shown as empty'
assert_touch_target(ui.element('bounty-board-retry'), 'retry button')
assert_touch_target(ui.element('bounty-filter-urgent'), '急 chip')
assert_inline_card(ui.snap('01-failed'), failed, 'failed card')
ui.tap('bounty-board-retry')
ui.element(FIRST_CARD)
ui.gone('bounty-board-failed')
assert chip('bounty-filter-all') == ui.t('bounty.board.filter.allCount', count=12), chip('bounty-filter-all')
ui.capture('02-loaded')
end = visible('bounty-board-end')
assert end.get('AXLabel') == ui.t('bounty.board.state.end'), end.get('AXLabel')
assert_inline_card(ui.snap('03-end'), end, 'end card')

relaunch(ui, drop=FAIL_FIRST, add=['-uiVerifyBoard', 'empty'])
empty = visible('bounty-board-empty')
assert empty.get('AXLabel') == ui.t('bounty.board.state.empty'), empty.get('AXLabel')
assert chip('bounty-filter-all') == ui.t('bounty.board.filter.allCount', count=0), chip('bounty-filter-all')
assert_inline_card(ui.snap('04-empty'), empty, 'empty card')
ui.tap('bounty-board-post')
ui.element('bounty-post-form')
ui.capture('05-post-sheet')

relaunch(ui, drop=FAIL_FIRST, add=['-uiVerifyBoardFail', 'refresh'])
ui.element(FIRST_CARD)
ui.at_rest()
assert by_id(ui.read(), 'bounty-board-stale') is None, 'the stale notice shows before any pull (a launch load failed)'
s = screen(ui.read())
ui.swipe((s['width'] / 2, s['height'] * 0.3), (s['width'] / 2, s['height'] * 0.8), 0.6)
stale_text = re.compile(ui.pattern('bounty.board.state.stale', time=r'\d{2}:\d{2}'))
stale = ui.wait_label('bounty-board-stale', lambda label: bool(stale_text.fullmatch(label)),
                      'a failed refresh shows no stale notice with a time')
items = ui.read()
assert by_id(items, FIRST_CARD), 'rows vanished after a failed refresh'
assert by_id(items, 'bounty-board-failed') is None, 'a failed refresh replaced the rows with the failed card'
assert_touch_target(ui.element('bounty-board-retry'), 'stale retry button')
visible('bounty-board-stale')
ui.capture('06-stale')
ui.tap('bounty-board-retry')
ui.gone('bounty-board-stale')
assert by_id(ui.read(), FIRST_CARD), 'rows vanished after retrying the refresh'
ui.capture('07-stale-retried')

relaunch(ui, drop=FAIL_FIRST, add=['-uiVerifyBoard', 'one'])
ui.element(ONE_CARD)
visible('bounty-filter-urgent')
ui.tap('bounty-filter-urgent')
filtered = ui.wait_label('bounty-board-filter-empty', lambda label: label == ui.t('bounty.board.state.emptyUrgent'),
                         'the empty 急 filter shows no inline card')
assert by_id(ui.read(), ONE_CARD) is None, 'the non-urgent row is shown under 急'
assert chip('bounty-filter-all') == ui.t('bounty.board.filter.all'), f'全部 shows a count while 急 is selected: {chip("bounty-filter-all")}'
filtered = visible('bounty-board-filter-empty')
assert_inline_card(ui.snap('08-filter-empty'), filtered, 'filter-empty card')
ui.tap('bounty-board-show-all')
ui.element(ONE_CARD)
ui.gone('bounty-board-filter-empty')
assert chip('bounty-filter-all') == ui.t('bounty.board.filter.allCount', count=1), chip('bounty-filter-all')
ui.capture('09-show-all')
print('PASS: failed, retry, end, empty with post, stale refresh and its retry, filter-empty and show all')
