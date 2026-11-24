"""Notifications turned off (chat.push.off): with the permission denied the app registers no push token, and live signals
still drive the in-app badge and strip. On the 拼车 tab, before any signal, the 消息 badge is not drawn and the strip does
not ask for a choice; the bounty.applied signal turns the strip into 帮取快递 · 3 人申请，去选, and the chat.message signal
after the long thread's reply draws the 消息 badge, without a pull, a tab switch or a foreground."""
import json
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from chat import badge_pixels  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, accessory, by_id  # noqa: E402
from live import entries, new_run, step_at  # noqa: E402

DEPS = ['src/lib/live/', 'src/lib/notifications/', 'src/lib/push/', 'src/lib/liveItems.ts', 'src/lib/useLiveItems.ts',
        'src/features/chat/', 'src/features/shell/', 'src/features/bounty/live/', 'src/app/(tabs)/_layout.tsx',
        'verification/ui/live.py', 'verification/ui/chat.py', 'verification/ui/bounty.py']
BUDGET = 240
APPLIED = 'bounty.applied:fixture-live-posterOpen'
MESSAGE = 'chat.message:fixture-chat-long'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyNotifications', 'denied', '-uiVerifyShellFeed', 'none',
        '-uiVerifyChat', '1', '-uiVerifyChatLong', '1', '-uiVerifyFixture', 'empty',
        '-uiVerifyBountyLive', 'posterOpen', '-uiVerifyBountyLiveNext', 'posterApplicants',
        '-uiVerifyLive', '30000:bounty.applied:fixture-live-posterOpen,33000:chat.message:fixture-chat-long']
RUN = new_run()

ui = UI(*sys.argv[1:])


def strip_label(items):
    return (accessory(items) or {}).get('AXLabel') or ''


relaunch(ui, drop=[], add=['-uiVerifyLiveRun', RUN])
ui.tap('tab-ride')
ui.wait(lambda items: str((by_id(items, 'tab-ride') or {}).get('AXValue')) == '1' or None, '拼车 is not selected')
after = ui.t('shell.accessory.label', title='帮取快递', sub=ui.tn('bounty.live.poster.applicants', 3))
ui.at_rest()
items = ui.read()
shot = ui.snap('01-before-signals')
delivered = [e['label'] for e in entries(ui, 'uiVerifyLiveSteps', RUN) or []]
assert delivered == [], f'signals arrived before the first look: {delivered}'
assert badge_pixels(ui, shot, items) < 40, 'the 消息 badge is drawn before any message arrived'
assert strip_label(items) != after, 'the strip asks for a choice before the signal'

step_at(ui, RUN, APPLIED)
ui.wait(lambda items: strip_label(items) == after or None,
        f'the signal did not turn the strip into {after!r}: {strip_label(ui.read())!r}', timeout=30)
step_at(ui, RUN, MESSAGE)
ui.wait(lambda items: badge_pixels(ui, ui.snap('badge-poll'), items) > 300 or None,
        'the chat.message signal did not draw the 消息 badge', timeout=30)
ui.at_rest()
ui.capture('02-after-signals')
calls = json.loads(defaults(ui, 'uiVerifyPushCalls') or '[]')
assert calls == [], f'a push token was registered with notifications off: {calls}'
print('PASS: with notifications off, live signals draw the 消息 badge and turn the strip into 去选 without a push token')
