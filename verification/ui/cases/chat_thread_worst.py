"""Worst case in a thread (break-ui): the 60-character bounty title stays one line in the item card with 看详情 still on
it; the safety card wraps whole; 2000-character messages from both sides wrap inside the screen with room on the
opposite side; the composer and 已读 stay on screen. Runs zh-Hans and ms (the longest safety copy)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, open_thread, within_screen  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyFixture', 'worst']
NAME = 'Nurul Aisyah binti Mohd Rahman Abdullah Hj. Kamaruddin'
# Art 30 pt, two lines (20 + 18) and 2 x 8 pt padding; a second title line would add 20.
ONE_LINE_CARD = 60

ui = UI(*sys.argv[1:])
safety = open_thread(ui, 'fixture-chat-worst', NAME)
items = ui.read()
card = by_id(items, 'chat-item-card')
within_screen(items, card)
assert card['frame']['height'] <= ONE_LINE_CARD, f'the long title wrapped in the item card: {card["frame"]}'
within_screen(items, safety)
assert safety.get('AXLabel') == ui.t('chat.thread.safety'), safety.get('AXLabel')
ui.at_rest()
ui.capture('01-open')

ui.at_rest()
items = ui.read()
read = by_id(items, 'chat-read-fixture-chat-worst-c2')
composer = by_id(items, 'chat-composer-input')
assert read and composer, 'no 已读 or composer'
assert read['frame']['y'] + read['frame']['height'] <= composer['frame']['y'] + 1, \
    f'the thread did not open at its newest message: 已读 at {read["frame"]}, composer at {composer["frame"]}'
mine = by_id(items, 'chat-bubble-fixture-chat-worst-c2')
assert read['frame']['y'] >= mine['frame']['y'] + mine['frame']['height'] - 1, \
    f'the long bubble runs past its row into 已读: bubble {mine["frame"]}, 已读 {read["frame"]}'
assert read['frame']['y'] > composer['frame']['y'] - 120, f'the end sits far above the composer: {read["frame"]}'
width = items[0]['frame']['width']
for bubble in bubbles(items):
    within_screen(items, bubble)
    f = bubble['frame']
    assert f['width'] <= width - 60, f'{bubble["AXUniqueId"]} leaves no room on the other side: {f}'
assert composer['frame']['y'] + composer['frame']['height'] <= items[0]['frame']['height'], 'composer off'
ui.capture('02-end')
print('PASS: one-line item card, whole safety card, long bubbles inside the screen, composer and 已读 on screen')
