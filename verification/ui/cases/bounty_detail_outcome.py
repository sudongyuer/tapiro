"""The applicant's two outcomes in the detail (53A, 54A). Not selected: 这次没选上 with 小林选了别人…, 你写的 with the note,
no 已申请 stamp and the sticker untilted (its rotated frame is as narrow as the sticker, while the applied fixture's tilted
sticker is wider); the fixture recorded exactly one seen mark for the bounty after the load; 看看附近别的悬赏 pops to the
board and scrolls it back to the top. Selected: 小林选了你 and 看进度 pinned (at least 44 pt), and the exact address
A 座 12-03 in a grouped row with the footer naming 小林; 看进度 pushes the helper's status screen (该出发了). Cancelled after
selection: 这单取消了 and 看进度 pinned, without 小林选了你 or the address; 看进度 pushes the status screen reading 这单取消了."""
import json
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import ink_box, screen, visible  # noqa: E402
from bounty import assert_grouped_background, relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, assert_touch_target, by_id, reach_home, token  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/(tabs)/bounty/', 'src/features/home/useHomeScroll.ts',
        'src/lib/homeSignals.ts', 'src/lib/useHomeSignals.ts', 'verification/ui/board.py',
        'verification/ui/bounty.py', 'verification/ui/choose.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 360
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyDetail', 'notSelected']
FIRST = ['-uiVerifyDetail', 'notSelected']
HELPER = ['-uiVerifyBountyRole', 'helper']
BOUNTY = 'fixture-bounty-01'
CARD = f'bounty-card-{BOUNTY}'
TILTED_CARD = 'bounty-card-fixture-bounty-03'
STICKER = 'bounty-detail-sticker'
STICKER_PT = 48
TILT_GROWTH = 4
SEEN_KEY = 'uiVerifyNotSelectedSeen'
NOTE = '我下午三点前都在宿舍，可以顺路帮你拿上来。'
SCROLL_PT = 160
STICKER_BAND = 90
STAMP_MIN = 40

ui = UI(*sys.argv[1:])


def seen_marks():
    text = defaults(ui, SEEN_KEY)
    return json.loads(text) if text else []


def open_detail(card_id):
    card = visible(ui, card_id)
    ui.at_rest()
    f = card['frame']
    ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
    ui.element('bounty-detail-title')


def label(identifier):
    return (ui.element(identifier).get('AXLabel') or '')


def stamp_ink(name):
    items = ui.read()
    title = by_id(items, 'bounty-detail-title')['frame']
    band = {'x': 0, 'y': title['y'] - STICKER_BAND, 'width': screen(items)['width'], 'height': STICKER_BAND}
    shot = ui.snap(name)
    assert_grouped_background(ui, shot, {'x': 0, 'y': title['y'], 'width': 12, 'height': title['height']}, name)
    return ink_box(shot, band, token('--color-success', ui.appearance), 40)


def progress_to_status(summary_key, shot):
    button = ui.element('bounty-detail-progress')
    assert button.get('AXLabel') == ui.t('bounty.status.action.view'), button.get('AXLabel')
    assert_touch_target(button, ui.t('bounty.status.action.view'))
    ui.at_rest()
    ui.tap('bounty-detail-progress')
    ui.wait_label('bounty-status-summary', lambda text: text == ui.t(summary_key),
                  f'看进度 did not push the status screen reading {ui.t(summary_key)}')
    ui.element('bounty-status-step-selected')
    ui.at_rest()
    ui.capture(shot)


def back_to_board():
    s = screen(ui.read())
    ui.swipe((1, s['height'] / 2), (s['width'] * 0.8, s['height'] / 2), 0.4)
    ui.gone('bounty-detail-title')


reach_home(ui)
ui.at_rest()
rest_y = ui.element(CARD)['frame']['y']
s = screen(ui.read())
ui.swipe((s['width'] / 2, s['height'] * 0.7), (s['width'] / 2, s['height'] * 0.7 - SCROLL_PT), 0.8)
ui.at_rest()
scrolled_y = ui.element(CARD)['frame']['y']
assert scrolled_y < rest_y - 40, f'the board did not scroll before opening the detail: {rest_y} -> {scrolled_y}'
assert seen_marks() == [], f'a seen mark was recorded before the detail opened: {seen_marks()}'

open_detail(CARD)
ui.wait_label('bounty-detail-not-selected', lambda text: text == ui.t('bounty.detail.notSelected.title'),
              'the detail never shows 这次没选上')
body = label('bounty-detail-not-selected-body')
assert body == ui.t('bounty.detail.notSelected.body', name='小林'), f'the body reads {body!r}'
note = label('bounty-detail-not-selected-note')
assert note == f"{ui.t('bounty.detail.notSelected.yourNote')} {NOTE}", f'the note reads {note!r}'
browse = ui.element('bounty-detail-browse')
assert browse.get('AXLabel') == ui.t('bounty.detail.notSelected.browse'), browse.get('AXLabel')
assert_touch_target(browse, ui.t('bounty.detail.notSelected.browse'))
items = ui.read()
for absent in ('bounty-detail-stamp', 'bounty-detail-applied', 'bounty-detail-withdraw', 'bounty-detail-apply',
               'bounty-detail-address'):
    assert by_id(items, absent) is None, f'{absent} is shown on a not-selected detail'
ui.at_rest()
untilted = ui.element(STICKER)['frame']
assert abs(untilted['width'] - STICKER_PT) <= 1, f'the not-selected sticker is still tilted: {untilted}'
ink = stamp_ink('01-not-selected')
assert ink is None or ink['count'] < STAMP_MIN, f'stamp ink on the not-selected detail: {ink}'

deadline = time.monotonic() + 10
while not seen_marks() and time.monotonic() < deadline:
    time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
time.sleep(1.5)
assert seen_marks() == [BOUNTY], f'expected one seen mark for {BOUNTY}: {seen_marks()}'

ui.tap('bounty-detail-browse')
ui.gone('bounty-detail-title')
ui.element('home-scroll')
ui.wait(lambda items: by_id(items, CARD) and abs(by_id(items, CARD)['frame']['y'] - rest_y) <= 4,
        f'看看附近别的悬赏 did not scroll the board back to the top (card at rest y {rest_y})')
ui.at_rest()
assert by_id(ui.read(), 'BackButton') is None, 'the 悬赏 stack is not at the board root'
ui.capture('02-board-top')
assert seen_marks() == [BOUNTY], f'leaving the detail recorded another seen mark: {seen_marks()}'

open_detail(TILTED_CARD)
ui.element('bounty-detail-stamp')
ui.at_rest()
tilted = ui.element(STICKER)['frame']
assert tilted['width'] >= STICKER_PT + TILT_GROWTH, f'the applied fixture sticker is not tilted, so the check is moot: {tilted}'
back_to_board()

relaunch(ui, drop=FIRST, add=['-uiVerifyDetail', 'selected', *HELPER])
open_detail(CARD)
ui.wait_label('bounty-detail-selected', lambda text: text == ui.t('bounty.detail.selected.title', name='小林'),
              'the detail never shows 小林选了你')
address = ui.element('bounty-detail-address')
assert 'A 座 12-03' in (address.get('AXLabel') or ''), f'the address reads {address.get("AXLabel")!r}'
assert ui.t('bounty.address.row') in address['AXLabel'], address['AXLabel']
ui.labelled(ui.t('bounty.address.footer', name='小林'))
items = ui.read()
for absent in ('bounty-detail-stamp', 'bounty-detail-not-selected', 'bounty-detail-apply', 'bounty-detail-withdraw'):
    assert by_id(items, absent) is None, f'{absent} is shown on a selected detail'
ui.at_rest()
stamp_ink('03-selected')
assert seen_marks() == [], f'a selected detail recorded a not-selected seen mark: {seen_marks()}'
progress_to_status('bounty.status.summary.helper.assigned', '04-selected-status')

relaunch(ui, drop=FIRST, add=['-uiVerifyDetail', 'selectedCancelled', *HELPER, '-uiVerifyBountyStatus', 'cancelled'])
open_detail(CARD)
ui.wait_label('bounty-detail-cancelled', lambda text: text == ui.t('bounty.status.cancelled'),
              'the cancelled detail never shows 这单取消了')
items = ui.read()
for absent in ('bounty-detail-selected', 'bounty-detail-address', 'bounty-detail-apply', 'bounty-detail-stamp'):
    assert by_id(items, absent) is None, f'{absent} is shown on a detail cancelled after selection'
assert not any((item.get('AXLabel') or '') == ui.t('bounty.detail.selected.title', name='小林') for item in items), \
    '小林选了你 is still shown after the cancel'
ui.at_rest()
ui.capture('05-cancelled')
progress_to_status('bounty.status.summary.helper.cancelled', '06-cancelled-status')
assert by_id(ui.read(), 'bounty-status-address') is None, 'the status screen shows the address after a cancel'
print('PASS: 这次没选上 untilted without a stamp, one seen mark, back to the board top; 小林选了你 with A 座 12-03 and '
      '看进度; cancelled after selection shows 这单取消了 and 看进度 to the status screen without the address')
