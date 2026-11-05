"""With no threads, 消息 is a moment screen: speckled ground, the large 小貘, 「还没有消息」, one line on when chats appear
and 「去看看悬赏」, which opens 悬赏; no failure card and no badge."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import badge_pixels, open_list  # noqa: E402
from driver import UI, assert_touch_target, by_id, close, selected, token  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py', 'src/ui/MomentBackground.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyFixture', 'empty']

ui = UI(*sys.argv[1:])
open_list(ui, ready='chat-empty')
title = ui.wait_label('chat-empty-title', lambda label: label == ui.t('chat.list.emptyTitle'),
                      'the moment title is not 还没有消息')
ui.labelled(ui.t('chat.list.emptyBody'))
action = ui.element('chat-empty-browse')
assert action.get('AXLabel') == ui.t('chat.list.emptyAction'), action.get('AXLabel')
assert_touch_target(action, '去看看悬赏')
items = ui.read()
for absent in ('chat-list-failed', 'chat-list-loading', 'chat-list'):
    assert by_id(items, absent) is None, f'{absent} shown on the empty moment'
ui.at_rest()
shot = ui.snap('01-empty')
f = title['frame']
ground = shot.rgb(8, f['y'] + f['height'] / 2)
expected = token('--color-moment-bg', ui.appearance)
assert close(ground, expected, 14), f'moment ground is {ground}, expected {expected}'
assert badge_pixels(ui, shot, items) < 40, 'the 消息 badge shows with no threads'

ui.tap('chat-empty-browse')
ui.wait(lambda items: selected(items) == ['tab-bounty'], '去看看悬赏 did not open 悬赏')
ui.element('home-scroll')
ui.capture('02-bounty')
print('PASS: empty moment with title, body and 去看看悬赏 into 悬赏')
