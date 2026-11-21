"""「去过的 · n 趟」 (219 A, default 225) pushes 去过的 with the settled rides, newest first, each a ticket reading 已结清;
with no other ride the list still shows 我的拼车 with the row and the joinable empty card, not the moment screen. Back
returns to 拼车 with the row deselected. 去过的 loads again on a pull and on coming back from a ticket (R2); a failed
reload keeps the tickets under 「没刷新成功 · 下面是 hh:mm 的」, never an empty list."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from gestures import pull  # noqa: E402
from hourcycle import clock  # noqa: E402
from ride import open_list, relaunch_list  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py', 'verification/ui/gestures.py']
LOCALES = ['zh-Hans', 'ms']
FIRST = 'ride-ticket-ride-history-1'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRides', 'history']

ui = UI(*sys.argv[1:])
open_list(ui)
row = ui.element('ride-list-history')
assert row.get('AXLabel') == ui.tn('ride.list.history', 3), row.get('AXLabel')
heading = ui.element('ride-list-mine').get('AXLabel')
assert heading == ui.t('ride.list.mine'), f'我的拼车 counts past rides or shows 0: {heading}'
items = ui.read()
assert by_id(items, 'ride-empty') is None, 'past rides alone showed the empty moment screen'
ui.element('ride-list-joinable-empty')
ui.capture('01-history-row')
ui.tap('ride-list-history')
ui.element('ride-history')
first = ui.element('ride-ticket-ride-history-1')
assert (first.get('AXLabel') or '').startswith(ui.t('ride.ticket.closed')), first.get('AXLabel')
ids = [i.get('AXUniqueId') for i in ui.read() if (i.get('AXUniqueId') or '').startswith('ride-ticket-ride-history-')]
assert ids == sorted(ids), f'past rides are not newest first: {ids}'
ui.capture('02-history')
ui.tap('BackButton')
ui.element('ride-list-history')
ui.gone('ride-history')
ui.capture('03-back')

stale_text = re.compile(ui.pattern('ride.history.stale', time=clock()))
relaunch_list(ui, add=['-uiVerifyRideFail', 'refresh'])
ui.tap('ride-list-history')
ui.element(FIRST)
assert by_id(ui.read(), 'ride-history-stale') is None, 'the stale note shows before any reload'
ui.at_rest()
pull(ui, ui.read())
ui.wait_label('ride-history-stale', lambda label: bool(stale_text.fullmatch(label)),
              'a pull on 去过的 did not load again (no stale note after a failing reload)')
items = ui.read()
assert by_id(items, FIRST), 'tickets vanished after a failed reload'
assert by_id(items, 'ride-history-empty') is None, 'a failed reload reads as no past rides'
ui.at_rest()
ui.capture('04-stale')

relaunch_list(ui, add=['-uiVerifyRideFail', 'refresh'])
ui.tap('ride-list-history')
ui.tap(FIRST)
ui.gone('ride-history')
ui.tap('BackButton')
ui.wait_label('ride-history-stale', lambda label: bool(stale_text.fullmatch(label)),
              'coming back to 去过的 did not load it again')
ui.capture('05-refocused')
print('PASS: history row, 去过的 list newest first, back to 拼车, reloads on pull and on return, stale kept on failure')
