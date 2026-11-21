"""With no live items, home shows the calm stage and the calm card with the 问小貘 entry, and no tab shows the accessory.
The card's sample lines are things 问小貘 can do today (a question and two bounties); each is a 44 pt button inside the
card (H9), and a tap opens 问小貘 with that line in the field, not sent."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import close_sheet, prompt_value  # noqa: E402
from driver import ACCESSORIES, UI, assert_appearance, assert_home, assert_touch_target, by_id  # noqa: E402

DEPS = [
    'src/features/home/',
    'src/features/shell/',
    'src/app/(tabs)/_layout.tsx',
    'src/app/(tabs)/bounty/',
    'src/app/ask.tsx',
    'src/features/ask/askSession.ts',
    'verification/ui/ask.py',
]

LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyShellFeed', 'none', '-uiVerifySignedIn', 'onboarded']

ui = UI(*sys.argv[1:])
items = assert_home(ui, 'calm', 'calm', ['calm'])
assert_touch_target(by_id(items, 'home-ask'), 'home-ask')
ask = by_id(items, 'home-ask')['frame']
assert ask['x'] + ask['width'] <= items[0]['frame']['width'], f'home-ask overflows: {ask}'
assert not any(by_id(items, a) for a in ACCESSORIES), 'accessory shown with no live items'
for index, key in enumerate(('chipQuestion', 'chipParcel', 'chipStudy')):
    chip = by_id(items, f'home-calm-chip-{index}')
    assert chip and chip.get('AXLabel') == ui.t(f'home.card.calm.{key}'), f'tag {index} reads {chip and chip.get("AXLabel")}'
    assert chip.get('type') == 'Button', f'tag {index} is not a button: {chip.get("type")}'
    assert_touch_target(chip, f'tag {index}')
    assert chip['frame']['x'] + chip['frame']['width'] <= ask['x'] + ask['width'], f'tag {index} overflows: {chip["frame"]}'
ui.capture('calm')

ui.tap('home-calm-chip-1')
ui.settled(lambda items: by_id(items, 'ask-tapir-sheet'), 'the chip did not open 问小貘')
ui.wait(lambda items: (by_id(items, 'ask-tapir-prompt') or {}).get('AXValue') == ui.t('home.card.calm.chipParcel'),
        f'the field does not hold the chip line: {prompt_value(ui)!r}')
assert by_id(ui.read(), 'ask-turn-0') is None, 'the chip line was sent'
ui.at_rest()
ui.capture('chip-prefilled')
close_sheet(ui)

ui.tap('tab-ride')
ui.element('ride-screen')
ui.wait(lambda items: str(by_id(items, 'tab-ride').get('AXValue')) == '1', '拼车 not selected')
items = ui.read()
assert not any(by_id(items, a) for a in ACCESSORIES), 'accessory shown on 拼车 with no live items'
shot = ui.capture('ride-calm')
assert_appearance(shot, ui.appearance, 20, 1300, 'ride background')
print('PASS: calm stage and card, chips open 问小貘 with the line filled in, no accessory')
