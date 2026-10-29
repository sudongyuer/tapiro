"""Detail 3A pushed from a board card: tapping the card body opens the detail with the same title and RM 8; the rows read the place with 约 300 m · 精确地址只给选中的人, the deadline with 急 in the urgent colour, and 小林 · 靠谱; 申请 is a 44 pt pinned button above the tab bar; an edge swipe back returns to the board at the same scroll position with the card deselected, and from a page-two card of the `long` board it returns to that card with every loaded page kept; a worst row's 500-character description scrolls while 申请 stays put; a failed load shows 没加载出来 with 重试 and no rows, and a gone bounty shows 这条悬赏已经不在了 with 返回."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import cards, distance_text, ink_box, screen, visible  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, assert_touch_target, bottom, by_id, close, reach_home, token  # noqa: E402

DEPS = ['src/features/bounty/', 'src/features/home/', 'src/app/(tabs)/', 'verification/ui/bounty.py',
        'verification/ui/board.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 420
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']
FIRST = 'bounty-card-fixture-bounty-01'
WORST = 'bounty-card-fixture-worst-01'
DEEP = 'bounty-card-fixture-long-25'
PAGE = 20
DESCRIPTION_LENGTH = 500
CARD_FILL = {'light': (255, 255, 255), 'dark': (28, 28, 30)}
URGENT_MIN = 20
SAME_PLACE = 2

ui = UI(*sys.argv[1:])


def label(identifier):
    return ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled').get('AXLabel') or ''


def assert_reads(identifier, *patterns):
    text = label(identifier)
    for pattern in patterns:
        assert re.search(pattern, text), f'{identifier} reads {text!r}, expected {pattern!r}'
    return text


def open_card(card_id):
    card = visible(ui, card_id)
    ui.at_rest()
    f = card['frame']
    ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
    ui.element('bounty-detail-title')
    ui.gone(card_id)
    return f


def apply_frame():
    button = ui.settled(lambda items: by_id(items, 'bounty-detail-apply'), '申请 never settled')
    assert button.get('AXLabel') == ui.t('bounty.detail.apply'), button.get('AXLabel')
    assert_touch_target(button, '申请')
    tabs = [i['frame']['y'] for i in ui.read() if i.get('type') == 'RadioButton']
    assert tabs, 'the tab bar is not shown under the detail'
    assert bottom(button) <= min(tabs), f'申请 ends at {bottom(button):.1f} pt, under the tab bar at {min(tabs):.1f} pt'
    return button['frame']


reach_home(ui)
card_before = open_card(FIRST)
assert label('bounty-detail-title') == '帮取快递', label('bounty-detail-title')
assert_reads('bounty-detail-reward', ui.pattern('bounty.post.confirm.rewardLabel', amount=r'RM\s?8'))
hint = ui.t('bounty.detail.placeHint', distance=distance_text(ui, 300))
assert_reads('bounty-detail-place', re.escape('Sunway Geo 宿舍'), re.escape(hint))
left = '|'.join(ui.pattern(f'bounty.detail.{unit}_{form}', **{name: r'\d+'})
                for unit, name in (('urgentHours', 'hours'), ('urgentMinutes', 'minutes'))
                for form in ('one', 'other'))
assert_reads('bounty-detail-time', ui.pattern('bounty.post.confirm.deadlineAt', when=r'.+? \d{2}:\d{2}'), left)
assert_reads('bounty-detail-poster', re.escape('小林'), re.escape(ui.t('bounty.tier.reliable')))
assert_reads('bounty-detail-description', re.escape('快递在 Sunway Geo 楼下的驿站'))
pinned = apply_frame()
ui.at_rest()
shot = ui.snap('01-detail')
time_row = ui.element('bounty-detail-time')['frame']
urgent = ink_box(shot, time_row, token('--color-urgent', ui.appearance), 40)
assert urgent and urgent['count'] >= URGENT_MIN, f'急 is not drawn in the urgent colour: {urgent}'
print(f'detail: 申请 {pinned["width"]:.0f} x {pinned["height"]:.0f} pt at y {pinned["y"]:.1f}')

s = screen(ui.read())
ui.swipe((1, s['height'] / 2), (s['width'] * 0.8, s['height'] / 2), 0.4)
ui.gone('bounty-detail-title')
card = ui.settled(lambda items: by_id(items, FIRST), 'swiping back did not return to the board')
ui.at_rest()
moved = abs(card['frame']['y'] - card_before['y'])
assert moved <= SAME_PLACE, f'the board moved {moved:.1f} pt after returning from the detail'
shot = ui.snap('02-returned')
f = card['frame']
fill = shot.rgb(f['x'] + f['width'] - 8, f['y'] + 6)
assert close(fill, CARD_FILL[ui.appearance], 6), f'the card is still selected after returning: {fill}'

relaunch(ui, drop=[], add=['-uiVerifyBoard', 'long'])
deep_before = open_card(DEEP)
s = screen(ui.read())
ui.swipe((1, s['height'] / 2), (s['width'] * 0.8, s['height'] / 2), 0.4)
ui.gone('bounty-detail-title')
ui.settled(lambda items: by_id(items, DEEP), 'swiping back from a page-two card did not return to it')
ui.at_rest()
items = ui.read()
deep = by_id(items, DEEP)
assert deep, 'the page-two card is gone after returning from its detail'
moved = abs(deep['frame']['y'] - deep_before['y'])
assert moved <= SAME_PLACE, f'the page-two card moved {moved:.1f} pt after returning from its detail'
loaded = len(cards(items))
assert loaded > PAGE, f'returning from the detail cut the board back to {loaded} cards'
ui.capture('03-returned-page-two')
print(f'page two: card 25 back at y {deep["frame"]["y"]:.1f} pt with {loaded} cards loaded')

relaunch(ui, drop=[], add=['-uiVerifyBoard', 'worst'])
open_card(WORST)
pinned = apply_frame()
ui.at_rest()
ui.capture('04-worst-top')
s = screen(ui.read())
for _ in range(8):
    found = by_id(ui.read(), 'bounty-detail-description')
    if found and bottom(found) <= pinned['y']:
        break
    ui.swipe((s['width'] / 2, s['height'] * 0.6), (s['width'] / 2, s['height'] * 0.2), 0.4)
else:
    raise AssertionError(f'the end of the description never scrolled above 申请: {found and found["frame"]}')
end = bottom(found)
assert 0 < end <= pinned['y'], f'the description ends at {end:.1f} pt, not on screen above 申请 at {pinned["y"]:.1f} pt'
text = label('bounty-detail-description')
assert len(text) == DESCRIPTION_LENGTH, f'the description reads {len(text)} characters, expected {DESCRIPTION_LENGTH}'
assert apply_frame() == pinned, '申请 moved while the description scrolled'
ui.at_rest()
ui.capture('05-worst-description')

relaunch(ui, drop=[], add=['-uiVerifyScene', 'bounty-detail', '-uiVerifyDetail', 'failOnce'], ready='ui-verify-ready')
failed = ui.settled(lambda items: by_id(items, 'bounty-detail-failed'), 'a failed load shows no notice')
assert ui.t('bounty.detail.failed') in (failed.get('AXLabel') or ''), failed.get('AXLabel')
items = ui.read()
for part in ('place', 'time', 'poster', 'description', 'apply'):
    assert by_id(items, f'bounty-detail-{part}') is None, f'a failed load still shows bounty-detail-{part}'
ui.at_rest()
ui.capture('06-failed')
ui.tap('bounty-detail-retry')
ui.element('bounty-detail-place')
ui.gone('bounty-detail-failed')
apply_scene = ui.element('bounty-detail-apply')
ui.tap('bounty-detail-apply')
ui.element('bounty-post-scene-apply-fixture-bounty-01')
assert_touch_target(apply_scene, '申请 in the scene')

relaunch(ui, drop=[], add=['-uiVerifyScene', 'bounty-detail', '-uiVerifyDetail', 'gone'], ready='ui-verify-ready')
gone = ui.settled(lambda items: by_id(items, 'bounty-detail-gone'), 'a gone bounty shows no notice')
assert gone.get('AXLabel') == ui.t('bounty.detail.gone'), gone.get('AXLabel')
assert by_id(ui.read(), 'bounty-detail-apply') is None, 'a gone bounty still offers 申请'
ui.at_rest()
ui.capture('07-gone')
back = ui.element('bounty-detail-back')
assert back.get('AXLabel') == ui.t('bounty.detail.back'), back.get('AXLabel')
ui.tap('bounty-detail-back')
ui.element('bounty-post-scene-gone')
