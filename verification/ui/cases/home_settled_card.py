"""The payer's 已结清 card (10A, 68A, 70A). One settle: the green card is in front with the 已结清 tag, the line naming
阿杰, the amount and a 44 pt 「收进贴纸本」 button, 小貘 says 阿杰收到钱了, and the tab-bar accessory stays away on 我的;
tapping the button writes one collect and leaves the calm card. Behind an 欠钱 card it is only the strip
「帮买奶茶 · 办成了」, the accessory on 我的 shows the payment without counting it, and fanning out reaches its button.
Two settles make two cards, each collected on its own. The worst case (40-code-point name, 120-code-point title, an
unnamed payee and a ride) keeps the card and its button on screen."""
import json
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, accessory, assert_colour, assert_touch_target, by_id, reach_home, token  # noqa: E402

DEPS = [
    'src/features/home/',
    'src/features/shell/',
    'src/lib/liveItems.ts',
    'src/lib/stickers/',
    'src/app/(tabs)/_layout.tsx',
    'src/ui/LiveCard.tsx',
    'src/ui/EarnedSticker.tsx',
    'verification/ui/bounty.py',
]
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySettled', 'one', '-uiVerifySignedIn', 'onboarded']
COLLECTED_KEY = 'uiVerifySettledCollected'

ui = UI(*sys.argv[1:])


def collected():
    text = defaults(ui, COLLECTED_KEY)
    return json.loads(text) if text else []


def card_label(title, name, amount):
    line = ui.t('home.card.settled.line', title=title, name=name) if name else \
        ui.t('home.card.settled.lineUnnamed', title=title)
    return ui.t('home.card.settled.a11y', line=line, amount=amount)


def beside(f):
    return {'x': f['x'] - 14, 'y': f['y'] + f['height'] * 0.35, 'width': 8, 'height': f['height'] * 0.3}


def assert_card(card, button, name):
    items = ui.read()
    width = items[0]['frame']['width']
    for element in (card, button):
        f = element['frame']
        assert f['x'] >= 0 and f['x'] + f['width'] <= width, f'{name}: {element.get("AXUniqueId")} overflows {f}'
    assert_touch_target(button, f'{name} 收进贴纸本')
    assert button.get('AXLabel') == ui.t('home.card.settled.collect'), button.get('AXLabel')
    assert button['frame']['y'] >= card['frame']['y'] + card['frame']['height'] - 1, \
        f'{name}: the button is not below the card text'


def no_accessory_on_me(more_than=None):
    ui.tap('tab-me')
    found = ui.settled(lambda items: items if by_id(items, 'tab-me') else None, '我的 never settled')
    shown = accessory(found)
    if more_than is None:
        assert shown is None, f'the accessory shows for a settled card: {shown and shown.get("AXLabel")}'
    else:
        assert shown, 'the 欠钱 accessory is missing on 我的'
        label = shown.get('AXLabel') or ''
        assert ui.t('pay.live.owe', name='阿杰') in label, label
        assert not re.search(ui.pattern('shell.accessory.withMore', sub='.*', count=r'\d+'), label), \
            f'the accessory counts the settled card: {label}'
    ui.capture(f'{"02" if more_than is None else "05"}-me-accessory')
    ui.tap('tab-bounty')
    ui.element('home-scroll')


reach_home(ui)
stage = ui.settled(lambda items: by_id(items, 'home-stage-live'), 'the live stage never settled')
assert stage.get('AXLabel') == ui.t('home.say.settled', name='阿杰'), stage.get('AXLabel')
card = ui.settled(lambda items: by_id(items, 'live-card-settled'), 'the 已结清 card is not in front')
assert card.get('AXLabel') == card_label('帮取快递', '阿杰', 'RM 15'), card.get('AXLabel')
items = ui.read()
assert by_id(items, 'live-cards-toggle') is None, 'one settled card shows the stack toggle'
button = by_id(items, 'settled-card-collect')
assert button, 'the 收进贴纸本 button is missing'
assert_card(card, button, 'one')
shot = ui.snap('01-front')
assert_colour(shot, beside(card['frame']), token('--color-card-progress', ui.appearance), '已结清 card')
no_accessory_on_me()
assert collected() == [], f'a collect was written before the tap: {collected()}'

ui.tap('settled-card-collect')
ui.settled(lambda items: by_id(items, 'live-card-calm'), 'the calm card did not replace the collected card')
assert by_id(ui.read(), 'live-card-settled') is None, 'the collected card is still shown'
ui.wait(lambda items: collected() == ['fixture-settled-0'] or None, f'collects are {collected()}', timeout=15)
ui.snap('03-collected')

relaunch(ui, drop=['-uiVerifySettled', 'one'], add=['-uiVerifySettled', 'behind', '-uiVerifyShellFeed', 'oweMoney'])
ui.settled(lambda items: by_id(items, 'home-stage-urgent'), 'the urgent stage never settled')
ui.settled(lambda items: by_id(items, 'live-card-oweMoney'), 'the 欠钱 card is not in front')
items = ui.read()
peek = by_id(items, 'live-card-peek-1')
assert peek and peek.get('AXLabel') == ui.t('home.card.settled.strip', title='帮买奶茶'), peek and peek.get('AXLabel')
assert by_id(items, 'live-card-settled') is None, 'the settled card is in front of 欠钱'
assert by_id(items, 'settled-card-collect') is None, 'the strip exposes its 收进贴纸本 button'
ui.snap('04-behind')
no_accessory_on_me(more_than=0)
ui.tap('live-card-peek-1')
ui.wait_label('live-cards-toggle', lambda label: label == ui.t('home.stack.collapse'), 'the strip did not fan out')
card = ui.settled(lambda items: by_id(items, 'live-card-settled'), 'the settled card did not fan out')
assert card.get('AXLabel') == card_label('帮买奶茶', 'Lily', 'RM 8'), card.get('AXLabel')
assert_card(card, ui.element('settled-card-collect'), 'behind')
ui.snap('06-behind-fanned')

relaunch(ui, drop=['-uiVerifySettled', 'behind', '-uiVerifyShellFeed', 'oweMoney'], add=['-uiVerifySettled', 'two'])
stage = ui.settled(lambda items: by_id(items, 'home-stage-live'), 'the live stage never settled')
assert stage.get('AXLabel') == ui.t('home.say.settled', name='Lily'), stage.get('AXLabel')
card = ui.settled(lambda items: by_id(items, 'live-card-settled'), 'the first settled card is not in front')
assert card.get('AXLabel') == card_label('帮买奶茶', 'Lily', '¥30'), card.get('AXLabel')
items = ui.read()
peek = by_id(items, 'live-card-peek-1')
assert peek and peek.get('AXLabel') == ui.t('home.card.settled.strip', title='帮取快递'), peek and peek.get('AXLabel')
toggle = by_id(items, 'live-cards-toggle')
assert toggle and toggle.get('AXLabel') == ui.t('home.stack.fanOut', count=2), toggle and toggle.get('AXLabel')
ui.snap('07-two')
ui.tap('settled-card-collect')
card = ui.settled(lambda items: (lambda c: c if c and c.get('AXLabel') == card_label('帮取快递', '阿杰', 'RM 15')
                                 else None)(by_id(items, 'live-card-settled')),
                  'the second settled card did not move to the front')
ui.wait(lambda items: collected() == ['fixture-settled-0'] or None, f'collects are {collected()}', timeout=15)
assert by_id(ui.read(), 'live-cards-toggle') is None, 'the toggle stayed with one card left'
ui.snap('08-two-one-left')

relaunch(ui, drop=['-uiVerifySettled', 'two'], add=['-uiVerifySettled', 'worst'])
card = ui.settled(lambda items: by_id(items, 'live-card-settled'), 'the worst settled card is not in front')
assert_card(card, ui.element('settled-card-collect'), 'worst')
toggle = ui.element('live-cards-toggle')
assert toggle.get('AXLabel') == ui.t('home.stack.fanOut', count=3), toggle.get('AXLabel')
ui.snap('09-worst')
ui.tap('live-cards-toggle')
ui.wait_label('live-cards-toggle', lambda label: label == ui.t('home.stack.collapse'), 'the worst stack did not fan out')
items = ui.read()
labels = [i.get('AXLabel') or '' for i in items if i.get('AXUniqueId') == 'live-card-settled']
unnamed = ui.t('home.card.settled.lineUnnamed', title='')
assert any(unnamed.strip(' ·') in label for label in labels), f'no unnamed card among {labels}'
ui.snap('10-worst-fanned')
print('PASS: 已结清 card in front, behind 欠钱, two settles and worst case')
