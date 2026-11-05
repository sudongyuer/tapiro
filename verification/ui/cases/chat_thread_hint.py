"""Thread screen on the demo bounty thread (118 A, 119 A): opening a row hides the tab bar; the item card pinned under
the navigation bar reads 帮取快递 · 已选好人 with 看详情; the fixed safety card with the 32 pt 小貘 head is the first item,
above every bubble, and has no close control; the transcript opens at the newest message just above the composer.
Tapping the card opens the bounty's status screen in 悬赏 (a cross-tab push, as notification taps do) and the tab bar
is back."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, open_thread, tab_bar_hidden, within_screen  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'src/app/(tabs)/_layout.tsx', 'verification/ui/chat.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1']

ui = UI(*sys.argv[1:])
safety = open_thread(ui, 'fixture-chat-bounty', '阿杰')
items = ui.wait(lambda items: len(bubbles(items)) == 3 and items, 'the demo thread never showed its three messages')
assert safety.get('AXLabel') == ui.t('chat.thread.safety'), safety.get('AXLabel')
card = by_id(items, 'chat-item-card')
assert card, 'no item card under the navigation bar'
expected = ui.t('chat.item.a11y', title='帮取快递', status=ui.t('chat.item.bounty.assigned'))
assert card.get('AXLabel') == expected, card.get('AXLabel')
assert_touch_target(card, 'chat-item-card')
within_screen(items, card)
nav = by_id(items, 'BackButton') or {'frame': {'y': 0, 'height': 100}}
assert card['frame']['y'] >= nav['frame']['y'] + nav['frame']['height'] - 1, f'card under the bar: {card["frame"]}'
first = bubbles(items)[0]
assert safety['frame']['y'] + safety['frame']['height'] <= first['frame']['y'], 'the safety card is not first'
assert safety['frame']['y'] >= card['frame']['y'] + card['frame']['height'], 'the safety card hides under the item card'
composer = by_id(items, 'chat-composer-input')
last = bubbles(items)[-1]
assert last['frame']['y'] + last['frame']['height'] <= composer['frame']['y'], 'the newest message is under the composer'
assert tab_bar_hidden(items), 'the tab bar stays while a thread is open'
ui.at_rest()
ui.capture('01-thread')

def opened(items):
    return by_id(items, 'bounty-status') or by_id(items, 'bounty-status-gone')


ui.tap('chat-item-card')
try:
    ui.wait(opened, 'first tap', 8)
except AssertionError:
    # Plain `axe tap` is dropped for stretches on iOS 27.2 (spike method notes); a touch down/up is not.
    ui.press('chat-item-card', 0.12)
ui.wait(opened, '看详情 did not open the bounty status screen', 45)
ui.wait(lambda items: str((by_id(items, 'tab-bounty') or {}).get('AXValue')) == '1', '悬赏 is not selected')
ui.at_rest()
assert not tab_bar_hidden(ui.read()), 'the tab bar did not come back outside the thread'
ui.capture('02-detail')
print('PASS: tab bar hidden, item card with 看详情, safety card first, newest above the composer, card opens the status')
