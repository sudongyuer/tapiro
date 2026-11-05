"""群聊 on the ride detail (126 A, carried to rides). An accepted member sees a 群聊 button in the navigation bar beside
⋯; it opens the ride's group thread in 消息 (the tab switches, the item card reads the route with its status, the safety
card shows) with the 消息 list under it. A non-member viewer of the same ride has no 群聊."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from chat import tab_bar_hidden, tap_button  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/ride/detail/', 'src/features/chat/', 'src/app/(tabs)/ride/', 'src/app/(tabs)/messages/',
        'verification/ui/chat.py', 'verification/ui/bounty.py']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
FIRST = ['-uiVerifyRideDetail', 'member']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyRideDetail', 'member']

ui = UI(*sys.argv[1:])
label = ui.t('ride.detail.chat')

ui.element('ride-detail-ticket', timeout=45)
button = ui.settled(lambda items: next((i for i in items if i.get('AXLabel') == label and i.get('type') == 'Button'),
                                       None), f'no {label} button in the navigation bar')
assert button['frame']['y'] < 120, f'{label} is not in the navigation bar: {button["frame"]}'
ui.at_rest()
ui.capture('01-member')

tap_button(ui, label)
ui.element('chat-safety', timeout=45)
card = ui.element('chat-item-card')
assert '双威' in (card.get('AXLabel') or '') and 'KLIA2' in (card.get('AXLabel') or ''), card.get('AXLabel')
assert tab_bar_hidden(ui.read()), 'the tab bar stays in a group opened from the ride'
ui.at_rest()
ui.capture('02-group')

ui.tap('BackButton')
ui.element('chat-list', timeout=30)
ui.wait(lambda items: str((by_id(items, 'tab-messages') or {}).get('AXValue')) == '1', '消息 is not selected')

relaunch(ui, drop=FIRST, add=['-uiVerifyRideDetail', 'viewer', '-uiVerifyScene', SCENE], ready='ride-detail-ticket')
ui.at_rest()
assert not any(i.get('AXLabel') == label for i in ui.read()), 'a non-member viewer has 群聊'
ui.capture('03-viewer')
print('PASS: 群聊 in the bar for a member opens the group in 消息 over the list; a viewer has none')
