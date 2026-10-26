"""Four tabs with a 消息 badge and the 62 pt 小貘 button switch screens; the accessory is hidden at the top of 悬赏 and shown on 拼车."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import (UI, TABS, accessory, assert_appearance, assert_tapir_button, assert_touch_target, by_id,  # noqa: E402
                    reach_home, selected)

DEPS = ['src/features/shell/', 'src/features/home/', 'src/app/(tabs)/', 'src/app/ask.tsx']

LOCALES = ['zh-Hans', 'ms']
SCREENS = {'tab-ride': 'ride-empty', 'tab-messages': 'messages-empty', 'tab-me': 'me-screen'}

ARGS = ['-uiVerifySignedIn', 'onboarded']
ui = UI(*sys.argv[1:])


reach_home(ui)
ui.settled(lambda items: by_id(items, 'tab-ask-tapir') and by_id(items, 'live-card-oweMoney'), 'home never settled')
items = ui.read()
assert selected(items) == ['tab-bounty'], f'selected tabs on launch: {selected(items)}'
assert accessory(items) is None, 'accessory shown at the top of 悬赏 while the live cards are on screen'
for identifier in TABS:
    assert_touch_target(by_id(items, identifier), identifier)
button = by_id(items, 'tab-ask-tapir')
assert button['frame']['width'] == 62 and button['frame']['height'] == 62, f'小貘 button is {button["frame"]}'
messages = by_id(items, 'tab-messages')['frame']
shot = ui.snap('01-bounty')
badge = shot.count({**messages, 'height': messages['height'] / 2}, lambda rgb: rgb[0] > 200 and rgb[1] < 110 and rgb[2] < 110)
assert badge > 300, f'消息 badge is not drawn ({badge} red pixels)'
assert_tapir_button(shot, button['frame'], ui.appearance, '62 pt 小貘 button')

for index, identifier in enumerate(TABS[1:], start=2):
    ui.tap(identifier)
    ui.element(SCREENS[identifier])
    items = ui.wait(lambda items: selected(items) == [identifier] and accessory(items) and items,
                    f'{identifier} not selected with the accessory shown')
    assert accessory(items)['AXLabel'].startswith(ui.t('pay.live.owe', name='阿杰')) and '15.00' in accessory(items)['AXLabel'], f'accessory label {accessory(items)["AXLabel"]}'
    shot = ui.snap(f'0{index}-{identifier[4:]}')
    assert_appearance(shot.path, ui.appearance, 20, 1300, f'{identifier} background')
    for element in (by_id(items, SCREENS[identifier]), accessory(items)):
        f = element['frame']
        assert f['x'] >= 0 and f['x'] + f['width'] <= 402, f'{element.get("AXUniqueId")} overflows the screen: {f}'

ui.tap('tab-bounty')
ui.settled(lambda items: selected(items) == ['tab-bounty'] and by_id(items, 'live-card-oweMoney'),
           '悬赏 not reselected')
ui.wait(lambda items: accessory(items) is None, 'accessory still shown back at the top of 悬赏', timeout=5)
print('PASS: tabs, badge, 小貘 button and accessory placement')
