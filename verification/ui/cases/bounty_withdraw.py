"""Withdraw 31A from an applied detail: the detail shows 已申请 · 等阿杰选 and 撤回申请; 撤回申请 opens the system action sheet 撤回申请？, 不撤回 (on iPhone the popover's cancel is a tap outside it) leaves the application in place, and 撤回申请 in the sheet shows progress, then brings 申请 back and removes the stamp; back on the board the card shows 申请 again without the stamp."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from apply import STAMP_MIN, has_stamp  # noqa: E402
from board import apply_pill, ink_box, screen, visible  # noqa: E402
from bounty import tap_sheet_action  # noqa: E402
from driver import UI, assert_touch_target, by_id, reach_home, token  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/(tabs)/bounty/', 'verification/ui/board.py', 'verification/ui/apply.py',
        'verification/ui/bounty.py']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']
CARD = 'bounty-card-fixture-bounty-03'
STICKER_BAND = 90

ui = UI(*sys.argv[1:])


def still_applied(when):
    items = ui.read()
    applied = by_id(items, 'bounty-detail-applied')
    assert applied and applied.get('AXLabel') == ui.t('bounty.detail.applied', name='阿杰'), \
        f'{when}: the detail does not read 已申请 · 等阿杰选: {applied and applied.get("AXLabel")}'
    assert by_id(items, 'bounty-detail-withdraw'), f'{when}: 撤回申请 is gone'
    assert by_id(items, 'bounty-detail-apply') is None, f'{when}: 申请 is back'


def detail_stamp(name):
    items = ui.read()
    title = by_id(items, 'bounty-detail-title')['frame']
    s = screen(items)
    band = {'x': 0, 'y': title['y'] - STICKER_BAND, 'width': s['width'], 'height': STICKER_BAND}
    found = ink_box(ui.snap(name), band, token('--color-success', ui.appearance), 40)
    return by_id(items, 'bounty-detail-stamp'), found


reach_home(ui)
card = visible(ui, CARD)
ui.at_rest()
f = card['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
ui.element('bounty-detail-title')
assert_touch_target(ui.element('bounty-detail-withdraw'), '撤回申请')
still_applied('on opening')
ui.at_rest()
element, ink = detail_stamp('01-applied')
assert element and ink and ink['count'] >= STAMP_MIN, f'the applied detail shows no 已申请 stamp: {ink}'

ui.tap('bounty-detail-withdraw')
ui.labelled(ui.t('bounty.detail.withdrawConfirm.title'))
ui.labelled(ui.t('bounty.detail.withdrawConfirm.body', name='阿杰'))
ui.at_rest()
ui.capture('02-confirm')
cancel = next((i for i in ui.read() if i.get('AXLabel') == ui.t('bounty.detail.withdrawConfirm.cancel')), None)
if cancel:
    ui.tap_label(ui.t('bounty.detail.withdrawConfirm.cancel'))
else:
    reward = ui.element('bounty-detail-reward')['frame']
    ui.tap_point(reward['x'] + reward['width'] / 2, reward['y'] + reward['height'] / 2)
ui.wait(lambda items: not any(i.get('AXLabel') == ui.t('bounty.detail.withdrawConfirm.title') for i in items),
        'the action sheet stayed open after 不撤回')
still_applied('after 不撤回')

ui.tap('bounty-detail-withdraw')
ui.labelled(ui.t('bounty.detail.withdrawConfirm.title'))
tap_sheet_action(ui, ui.t('bounty.detail.withdrawConfirm.confirm'), 'bounty-detail-withdraw')
ui.element('bounty-detail-withdrawing', timeout=5)
apply = ui.element('bounty-detail-apply')
assert apply.get('AXLabel') == ui.t('bounty.detail.apply'), apply.get('AXLabel')
items = ui.read()
for gone in ('bounty-detail-applied', 'bounty-detail-withdraw', 'bounty-detail-withdrawing'):
    assert by_id(items, gone) is None, f'{gone} is still shown after withdrawing'
ui.at_rest()
element, ink = detail_stamp('03-withdrawn')
assert element is None and (ink is None or ink['count'] < STAMP_MIN), f'the stamp is still on the detail: {ink}'

s = screen(ui.read())
ui.swipe((1, s['height'] / 2), (s['width'] * 0.8, s['height'] / 2), 0.4)
ui.gone('bounty-detail-title')
card = ui.settled(lambda items: by_id(items, CARD), 'swiping back did not return to the board')
assert ui.t('bounty.board.card.applied') not in (card.get('AXLabel') or ''), card.get('AXLabel')
ui.at_rest()
shot = ui.snap('04-card')
pill = apply_pill(shot, card, ui.appearance)
assert pill and pill['height'] >= 40, f'the card does not show 申请 again: {pill}'
assert not has_stamp(ui, shot, card['frame']), 'the card still shows the 已申请 stamp'
