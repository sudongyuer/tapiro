"""Entry from a bounty thread (247 A): the navigation title 阿杰 is a button with a chevron and the hint 看阿杰的主页; a tap
pushes 阿杰's profile in the 消息 tab (one read for fixture-chat-jie) and the back button returns to the thread."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import open_thread  # noqa: E402
from driver import UI, assert_touch_target  # noqa: E402
from profile import open_profile, rep_calls  # noqa: E402

DEPS = ['src/features/chat/list/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py', 'src/features/reputation/profile/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1']

ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', '阿杰')
title = ui.element('chat-thread-title', timeout=30)
assert title.get('AXLabel') == '阿杰', title.get('AXLabel')
assert_touch_target(title, '对话标题')
ui.at_rest()
ui.capture('01-thread')
ui.tap('chat-thread-title')
open_profile(ui)
assert [call['personId'] for call in rep_calls(ui, 'profile', 1)] == ['fixture-chat-jie']
ui.at_rest()
ui.capture('02-profile')
ui.tap('BackButton')
ui.gone('profile-screen')
ui.element('chat-composer-input', timeout=30)
print('PASS: the thread title pushes the peer profile and back returns to the thread')
