"""Four tabs with a 消息 badge and the round 小貘 button beside the bar switch screens; the accessory is hidden at the top of 悬赏 and shown on 拼车."""
import json
import re
import subprocess
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import (UI, TABS, accessory, assert_appearance, assert_tapir_button, assert_touch_target, by_id,  # noqa: E402
                    reach_home, selected)

DEPS = ['src/features/shell/', 'src/features/home/', 'src/app/(tabs)/', 'src/app/ask.tsx']

LOCALES = ['zh-Hans', 'ms']
SCREENS = {'tab-ride': 'ride-screen', 'tab-messages': 'messages-empty', 'tab-me': 'me-screen'}

ARGS = ['-uiVerifySignedIn', 'onboarded']
TAPIR_SIZE = {26: 62, 27: 62}
TAPIR_GAP = 4
ui = UI(*sys.argv[1:])


def ios_major(udid):
    listing = subprocess.run(['xcrun', 'simctl', 'list', 'devices', '-j'], capture_output=True, text=True,
                             check=True, timeout=30).stdout
    devices = json.loads(listing)['devices']
    runtime = next(r for r, listed in devices.items() if any(d['udid'] == udid for d in listed))
    return int(re.search(r'iOS-(\d+)', runtime).group(1))


def assert_tapir_beside_bar(items, ios):
    f = by_id(items, 'tab-ask-tapir')['frame']
    last = max(by_id(items, t)['frame']['x'] + by_id(items, t)['frame']['width'] for t in TABS)
    print(f'iOS {ios}: 小貘 button {f}, last tab ends at x={last:.1f}')
    assert f['x'] >= last + TAPIR_GAP, f'小貘 button {f} is not apart from the tab bar on the trailing side (last tab ends at {last})'
    assert abs(f['width'] - f['height']) < 1, f'小貘 button is not round: {f}'
    assert_touch_target(by_id(items, 'tab-ask-tapir'), '小貘 button')
    assert ios in TAPIR_SIZE, f'no measured 小貘 button size for iOS {ios}; measure it before adding one'
    assert abs(f['width'] - TAPIR_SIZE[ios]) < 1, f'小貘 button on iOS {ios} is {f["width"]} pt, expected {TAPIR_SIZE[ios]}'
    return f


reach_home(ui)
ui.settled(lambda items: by_id(items, 'tab-ask-tapir') and by_id(items, 'live-card-oweMoney'), 'home never settled')
items = ui.read()
assert selected(items) == ['tab-bounty'], f'selected tabs on launch: {selected(items)}'
assert accessory(items) is None, 'accessory shown at the top of 悬赏 while the live cards are on screen'
for identifier in TABS:
    assert_touch_target(by_id(items, identifier), identifier)
button = assert_tapir_beside_bar(items, ios_major(ui.udid))
messages = by_id(items, 'tab-messages')['frame']
shot = ui.snap('01-bounty')
badge = shot.count({**messages, 'height': messages['height'] / 2}, lambda rgb: rgb[0] > 200 and rgb[1] < 110 and rgb[2] < 110)
assert badge > 300, f'消息 badge is not drawn ({badge} red pixels)'
assert_tapir_button(shot, button, ui.appearance, '小貘 button')

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
