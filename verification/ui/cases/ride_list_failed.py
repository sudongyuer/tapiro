"""A failed first load shows the 「拼车没加载出来」 card with 重试 and keeps the nav-bar ＋, never an empty list; 重试
loads the tickets. A failed pull to refresh keeps the last tickets under the warning 「没刷新成功 · 下面是 hh:mm 的」 with
重试 (RideDetail1 default)."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from gestures import pull  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from ride import add_button, open_list, relaunch_list  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py', 'src/ui/InlineState.tsx', 'verification/ui/gestures.py']
LOCALES = ['zh-Hans', 'ms']
FAIL_FIRST = ['-uiVerifyRideFail', 'first']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideFail', 'first']
FIRST = 'ride-ticket-ride-leaving'

ui = UI(*sys.argv[1:])
open_list(ui, ready='ride-list-failed')
failed = ui.element('ride-list-failed')
assert failed.get('AXLabel') == ui.t('ride.list.failed'), failed.get('AXLabel')
items = ui.read()
assert by_id(items, 'ride-empty') is None, 'a failed load is shown as the empty moment'
assert by_id(items, FIRST) is None, 'tickets shown under a failed first load'
assert add_button(ui), 'the ＋ is hidden after a failed first load'
assert_touch_target(ui.element('ride-list-retry'), '重试')
ui.capture('01-failed')
ui.tap('ride-list-retry')
ui.element(FIRST)
ui.gone('ride-list-failed')
ui.capture('02-retried')

relaunch_list(ui, drop=FAIL_FIRST, add=['-uiVerifyRideFail', 'refresh'])
ui.element(FIRST)
ui.at_rest()
pull(ui, ui.read())
stale_text = re.compile(ui.pattern('ride.list.stale', time=r'\d{2}:\d{2}'))
ui.wait_label('ride-list-stale', lambda label: bool(stale_text.fullmatch(label)),
              'a failed refresh shows no stale note with the time')
items = ui.read()
assert by_id(items, FIRST), 'tickets vanished after a failed refresh'
assert by_id(items, 'ride-list-failed') is None, 'a failed refresh replaced the tickets with the failed card'
ui.capture('03-stale')
print('PASS: failed first load with ＋ and retry; failed refresh keeps the tickets under the stale note')
