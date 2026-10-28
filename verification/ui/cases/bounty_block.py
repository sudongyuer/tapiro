"""Block 5A/37A from the detail: the board reads 全部 12; the detail's ⋯ (更多) holds 屏蔽小林, which opens the system action sheet 屏蔽小林？ stating the effect; 不屏蔽 (or a tap outside when the sheet has no cancel button) keeps the detail; 屏蔽 shows progress in place of ⋯; the first block fails (`-uiVerifyBlock failOnce`) and the detail stays with 没屏蔽成功; the second closes the detail and the board reads 全部 11 without 小林's bounty. 我的 → 屏蔽名单 (a 44 pt row) lists 小林; swiping the row left reveals 解除, which shows progress; the first 解除 fails and keeps 小林 with 没解除成功, the second empties the list; back on 悬赏 the board reads 全部 12 and 小林's bounty is there again."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import visible  # noqa: E402
from bounty import tap_sheet_action  # noqa: E402
from driver import UI, assert_touch_target, by_id, reach_home, tab  # noqa: E402

DEPS = ['src/features/bounty/', 'src/features/account/', 'src/app/(tabs)/', 'verification/ui/board.py',
        'verification/ui/bounty.py']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBlock', 'failOnce']
CARD = 'bounty-card-fixture-bounty-01'
PERSON = 'fixture-poster-lin'
ROW = f'blocked-row-{PERSON}'
SWIPE = 120
NAME = '小林'

ui = UI(*sys.argv[1:])


def all_count(count, message):
    expected = ui.t('bounty.board.filter.allCount', count=count)
    return ui.wait_label('bounty-filter-all', lambda label: label == expected, message)


def switch_to(identifier):
    items = ui.read()
    if by_id(items, identifier) is None:
        home = tab(items, ui.t('shell.tabs.bounty'))
        assert home, f'neither {identifier} nor the minimised 悬赏 tab is on screen'
        f = home['frame']
        ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)
    ui.tap(identifier)


def open_menu():
    ui.tap_label(ui.t('bounty.detail.more'))
    return ui.labelled(ui.t('bounty.block.menu', name=NAME))


def confirm_block():
    open_menu()
    ui.tap_label(ui.t('bounty.block.menu', name=NAME))
    ui.labelled(ui.t('bounty.block.confirm.title', name=NAME))
    tap_sheet_action(ui, ui.t('bounty.block.confirm.confirm'), 'bounty-detail-title')
    blocking = ui.element('bounty-detail-blocking', timeout=5)
    assert blocking.get('AXLabel') == ui.t('bounty.block.blocking'), blocking.get('AXLabel')


def swipe_row(person, shot):
    f = person['frame']
    y = f['y'] + f['height'] / 2
    start = f['x'] + f['width'] - 24
    ui.swipe((start, y), (start - SWIPE, y), duration=0.4)
    ui.labelled(ui.t('bounty.block.list.unblock'))
    ui.at_rest()
    ui.capture(shot)


def unblock_tapped():
    ui.tap_label(ui.t('bounty.block.list.unblock'))
    spinner = ui.element(f'blocked-unblocking-{PERSON}', timeout=5)
    assert spinner.get('AXLabel') == ui.t('bounty.block.list.unblocking'), spinner.get('AXLabel')


def sheet_open(items):
    return any(i.get('AXLabel') == ui.t('bounty.block.confirm.title', name=NAME) for i in items)


reach_home(ui)
all_count(12, 'the board does not read 全部 12 before blocking')
card = visible(ui, CARD)
ui.at_rest()
f = card['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
ui.element('bounty-detail-title')

open_menu()
ui.capture('01-menu')
ui.tap_label(ui.t('bounty.block.menu', name=NAME))
ui.labelled(ui.t('bounty.block.confirm.title', name=NAME))
ui.labelled(ui.t('bounty.block.confirm.body', name=NAME))
ui.at_rest()
ui.capture('02-confirm')
cancel = next((i for i in ui.read() if i.get('AXLabel') == ui.t('bounty.block.confirm.cancel')), None)
if cancel:
    ui.tap_label(ui.t('bounty.block.confirm.cancel'))
else:
    title = ui.element('bounty-detail-title')['frame']
    ui.tap_point(title['x'] + title['width'] / 2, title['y'] + title['height'] / 2)
ui.wait(lambda items: not sheet_open(items), 'the action sheet stayed open after 不屏蔽')
ui.element('bounty-detail-title')
assert by_id(ui.read(), 'bounty-detail-blocking') is None, '不屏蔽 started a block'

confirm_block()
ui.wait_label('bounty-detail-block-failed', lambda label: ui.t('bounty.block.failed') in label,
              'a failed block does not say 没屏蔽成功')
ui.element('bounty-detail-title')
ui.labelled(ui.t('bounty.detail.more'))
ui.at_rest()
ui.capture('03-block-failed')
confirm_block()
ui.gone('bounty-detail-title')
all_count(11, 'the board does not read 全部 11 after blocking 小林')
items = ui.read()
assert by_id(items, CARD) is None, "小林's bounty is still on the board"
assert not any(NAME in (i.get('AXLabel') or '') for i in items if (i.get('AXUniqueId') or '').startswith('bounty-card-')), \
    'a card by 小林 is still on the board'
ui.at_rest()
ui.capture('04-board-without')

switch_to('tab-me')
row = ui.element('me-blocked')
assert row.get('AXLabel') and ui.t('bounty.block.list.title') in row['AXLabel'], row.get('AXLabel')
assert_touch_target(row, '屏蔽名单')
ui.tap('me-blocked')
ui.element('blocked-screen')
person = ui.wait_label(ROW, lambda label: label == NAME, '屏蔽名单 does not list 小林')
assert_touch_target(person, '小林 row')
ui.at_rest()
ui.capture('05-list')

swipe_row(person, '06-swiped')
unblock_tapped()
ui.wait_label('blocked-unblock-failed', lambda label: ui.t('bounty.block.list.unblockFailed') in label,
              'a failed 解除 does not say 没解除成功')
person = ui.wait_label(ROW, lambda label: label == NAME, 'a failed 解除 removed 小林 from the list')
ui.at_rest()
ui.capture('07-unblock-failed')
swipe_row(person, '08-swiped-again')
unblock_tapped()
empty = ui.element('blocked-empty', timeout=15)
assert ui.t('bounty.block.list.emptyTitle') in (empty.get('AXLabel') or ''), empty.get('AXLabel')
assert by_id(ui.read(), ROW) is None, '小林 is still listed after 解除'
ui.at_rest()
ui.capture('09-empty')

switch_to('tab-bounty')
all_count(12, 'the board does not read 全部 12 after 解除')
visible(ui, CARD)
ui.at_rest()
ui.capture('10-board-again')
print('PASS: 屏蔽小林 hid the bounty, 屏蔽名单 listed 小林, 解除 brought the bounty back')
