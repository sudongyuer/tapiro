"""Welcome A settles with seven stickers, 小貘's bubble, the wordmark and the sign-in panel; tapping a sticker puts its example in the bubble."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
import time

from driver import UI, assert_colour, assert_touch_target, by_id, bottom, dominant, luma, token  # noqa: E402

LOCALES = ['zh-Hans', 'ms']
KINDS = ['parcel', 'coffee', 'ticket', 'books', 'umbrella', 'car', 'boba']
HELLO = {'zh-Hans': '你好呀', 'ms': 'Hai!'}
EXAMPLES = {
    'zh-Hans': {'parcel': '帮取快递 · RM 8', 'coffee': '帮带咖啡 · RM 5'},
    'ms': {'parcel': 'Ambil bungkusan · RM 8', 'coffee': 'Belikan kopi · RM 5'},
}

ui = UI(*sys.argv[1:])


def risen(items):
    button = by_id(items, 'sign-in-apple')
    return button if button and bottom(button) <= items[0]['frame']['height'] else None


apple = ui.settled(risen, 'the sign-in panel never settled')
items = ui.read()
screen = items[0]['frame']

for provider in ('apple', 'google'):
    button = by_id(items, f'sign-in-{provider}')
    assert button, f'{provider} button missing'
    assert_touch_target(button, f'{provider} sign-in button')
    assert bottom(button) <= screen['height'], f'{provider} button is below the screen: {button["frame"]}'
for page in ('terms', 'privacy'):
    assert by_id(items, f'welcome-{page}-link'), f'{page} link missing'

panel_top = by_id(items, 'welcome-headline')['frame']['y']
for kind in KINDS:
    sticker = by_id(items, f'welcome-sticker-{kind}')
    assert sticker, f'{kind} sticker missing'
    assert_touch_target(sticker, f'{kind} sticker')
    assert bottom(sticker) <= panel_top, f'{kind} sticker sits under the panel: {sticker["frame"]}'
wordmark = by_id(items, 'welcome-wordmark')
assert wordmark and bottom(wordmark) <= panel_top, f'wordmark sits under the panel: {wordmark}'
label = by_id(items, 'welcome-sticker-parcel').get('AXLabel')
assert label == EXAMPLES[ui.locale]['parcel'], f'parcel sticker reads {label}'
ui.wait_label('welcome-bubble', lambda text: text == HELLO[ui.locale], 'bubble does not greet')

time.sleep(1)
again = by_id(ui.read(), 'welcome-headline')['frame']
assert again == by_id(items, 'welcome-headline')['frame'], f'panel moved after settling: {again}'

ui.at_rest('sticker and mascot loops never came to rest (two screenshots 1 s apart still differ)')

shot = ui.snap('01-settled')
f = apple['frame']
fill = luma(dominant(shot, {'x': f['x'] + f['width'] * 0.08, 'y': f['y'] + f['height'] / 2 - 4, 'width': 16, 'height': 8}))
if ui.appearance == 'dark':
    assert fill > 215, f'Apple button is not white in dark appearance (luma {fill:.0f})'
else:
    assert fill < 40, f'Apple button is not black in light appearance (luma {fill:.0f})'
assert_colour(shot, {'x': 2, 'y': 230, 'width': 12, 'height': 12},
              token('--color-moment-bg', ui.appearance), 'moment background')

ui.axe('tap', '--id', 'welcome-sticker-coffee', '--post-delay', '0.5')
ui.wait_label('welcome-bubble', lambda text: text == EXAMPLES[ui.locale]['coffee'],
              'bubble did not show the coffee example')
ui.capture('02-tapped-coffee')
print('PASS: welcome A settled with stickers, bubble, wordmark and a 44 pt sign-in panel; a tap changes the bubble')
