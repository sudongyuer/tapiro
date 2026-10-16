"""With no live items, home shows the calm stage and the calm card with the 问小貘 entry, and no tab shows the accessory."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import ACCESSORIES, UI, assert_appearance, assert_home, assert_touch_target, by_id  # noqa: E402

LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyShellFeed', 'none', '-uiVerifySignedIn', 'onboarded']

ui = UI(*sys.argv[1:])
items = assert_home(ui, 'calm', 'calm', ['calm'])
assert_touch_target(by_id(items, 'home-ask'), 'home-ask')
ask = by_id(items, 'home-ask')['frame']
assert ask['x'] + ask['width'] <= items[0]['frame']['width'], f'home-ask overflows: {ask}'
assert not any(by_id(items, a) for a in ACCESSORIES), 'accessory shown with no live items'

ui.tap('tab-ride')
ui.element('ride-empty')
ui.wait(lambda items: str(by_id(items, 'tab-ride').get('AXValue')) == '1', '拼车 not selected')
items = ui.read()
assert not any(by_id(items, a) for a in ACCESSORIES), 'accessory shown on 拼车 with no live items'
shot = ui.capture('ride-calm')
assert_appearance(shot, ui.appearance, 20, 1300, 'ride background')
print('PASS: calm stage and card, no accessory')
