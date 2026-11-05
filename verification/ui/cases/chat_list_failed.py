"""A failed first load of 消息 shows 「消息没加载出来」 with 重试, never the empty moment; 重试 loads the rows. A failed
pull to refresh keeps the rows under the warning 「可能不是最新 · hh:mm 的数据」 with 重试, and a dropped live channel
shows 「可能不是最新」 above the rows."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from chat import open_list, rows  # noqa: E402
from gestures import pull  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py', 'src/ui/InlineState.tsx',
        'src/ui/OfflineLine.tsx', 'src/lib/live/', 'verification/ui/gestures.py']
LOCALES = ['zh-Hans', 'ms']
FAIL_FIRST = ['-uiVerifyChatFail', 'list']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyChatFail', 'list']
FIRST = 'chat-row-fixture-chat-bounty'

ui = UI(*sys.argv[1:])
open_list(ui, ready='chat-list-failed')
failed = ui.element('chat-list-failed')
assert failed.get('AXLabel') == ui.t('chat.list.failed'), failed.get('AXLabel')
items = ui.read()
assert by_id(items, 'chat-empty') is None, 'a failed load is shown as the empty moment'
assert not rows(items), 'rows shown under a failed first load'
assert_touch_target(ui.element('chat-list-retry'), '重试')
ui.at_rest()
ui.capture('01-failed')
ui.tap('chat-list-retry')
ui.element(FIRST)
ui.gone('chat-list-failed')
ui.capture('02-retried')

relaunch(ui, drop=FAIL_FIRST, add=['-uiVerifyChatFail', 'listRefresh'], ready='home-scroll')
ui.tap('tab-messages')
ui.element(FIRST)
ui.at_rest()
pull(ui, ui.read())
stale = re.compile(ui.pattern('live.staleAt', time=r'\d{2}:\d{2}'))
ui.wait_label('chat-list-stale', lambda label: bool(stale.fullmatch(label)),
              'a failed refresh shows no stale note with the time')
items = ui.read()
assert by_id(items, FIRST), 'rows vanished after a failed refresh'
assert by_id(items, 'chat-list-failed') is None, 'a failed refresh replaced the rows with the failed card'
ui.at_rest()
ui.capture('03-stale')
ui.tap('chat-list-retry')
ui.gone('chat-list-stale')

relaunch(ui, drop=FAIL_FIRST, add=['-uiVerifyLive', '1500:drop'], ready='home-scroll')
ui.tap('tab-messages')
ui.element(FIRST)
offline = ui.element('chat-list-offline', timeout=20)
assert offline.get('AXLabel') == ui.t('live.offline'), offline.get('AXLabel')
assert offline['frame']['y'] < ui.element(FIRST)['frame']['y'], 'the offline line is not above the rows'
ui.at_rest()
ui.capture('04-offline')
print('PASS: failed first load with retry; failed refresh keeps rows under the stale note; offline line above rows')
