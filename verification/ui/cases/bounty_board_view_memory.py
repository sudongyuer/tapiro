"""View memory (G13, ruling 7): the chosen view is stored on the device; the first launch that restores the map shows
记住了 under the title and removes it after about 4 s (gone within 8 s); later launches restore the map without it; a
launch that restores the map with the flag cleared shows it again until the first scroll (with `-uiVerifyHintMs 30000`,
so only the scroll can remove it within 12 s); choosing 列表 is restored as the list, without 记住了. Each relaunch keeps
the stored view (`-uiVerifyBoardView keep`). The scroll drags above the title, so it moves the page, not the map."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import cards, screen, visible  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/bounty/', 'src/features/home/', 'src/app/(tabs)/', 'verification/ui/bounty.py',
        'verification/ui/board.py']
LOCALES = ['zh-Hans', 'en']
BUDGET = 300
SEED = ['-uiVerifyBoardView', 'list']
KEEP = ['-uiVerifyBoardView', 'keep']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', *SEED]
HINT = 'bounty-board-remembered'
HINT_LATEST = 8.0
LONG_HINT = ['-uiVerifyHintMs', '30000']
SCROLL_LATEST = 12.0
QUIET_READS = 4

ui = UI(*sys.argv[1:])


def restart(seed):
    relaunch(ui, drop=SEED, add=seed)


def in_map_view():
    ui.element('bounty-view-map')
    ui.wait(lambda items: by_id(items, 'bounty-board-title') and not cards(items), 'the board did not open in map view')


def in_list_view():
    ui.wait(lambda items: cards(items), 'the board did not open in list view')


def assert_no_hint(name):
    for _ in range(QUIET_READS):
        assert by_id(ui.read(), HINT) is None, f'记住了 shows on {name}'


def hint_under_title():
    items = ui.wait(lambda items: items if by_id(items, HINT) else None, '记住了 does not show')
    seen = time.monotonic()
    hint = by_id(items, HINT)
    assert hint.get('AXLabel') == ui.t('bounty.board.remembered'), hint.get('AXLabel')
    title = by_id(items, 'bounty-board-title')
    assert title and hint['frame']['y'] >= title['frame']['y'] + title['frame']['height'] - 2, \
        f'记住了 is not under the title: {hint["frame"]} / {title and title["frame"]}'
    return seen, items


reach_home(ui)
in_list_view()
assert_no_hint('a launch in list view')
visible(ui, 'bounty-view-map')
ui.tap('bounty-view-map')
in_map_view()
assert_no_hint('choosing 地图 by hand')

restart(KEEP)
seen, _ = hint_under_title()
ui.capture('01-remembered')
ui.gone(HINT, timeout=HINT_LATEST)
print(f'记住了 seen, gone {time.monotonic() - seen:.1f} s later')
in_map_view()

restart(KEEP)
in_map_view()
assert_no_hint('the second launch that restores the map')
ui.capture('02-restored-again')

restart(['-uiVerifyBoardView', 'map', *LONG_HINT])
in_map_view()
seen, items = hint_under_title()
s = screen(items)
start = max(s['height'] * 0.3, min(by_id(items, 'bounty-board-title')['frame']['y'] - 30, s['height'] * 0.6))
ui.swipe((s['width'] / 2, start), (s['width'] / 2, start - s['height'] * 0.12), 0.3)
ui.gone(HINT, timeout=SCROLL_LATEST)
after_scroll = time.monotonic() - seen
print(f'记住了 removed by a scroll {after_scroll:.1f} s after it showed')

visible(ui, 'bounty-view-list')
ui.tap('bounty-view-list')
in_list_view()
restart(KEEP)
in_list_view()
assert_no_hint('a launch that restores the list')
visible(ui, 'bounty-view-list')
ui.capture('03-list-restored')
print('PASS: map restored with 记住了 once, gone after ~4 s or a scroll, list restored')
