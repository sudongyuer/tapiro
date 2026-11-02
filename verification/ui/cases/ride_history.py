"""「去过的 · n 趟」 (219 A, default 225) pushes 去过的 with the settled rides, newest first, each a ticket reading 已结清;
with no other ride the list still shows 我的拼车 with the row and the joinable empty card, not the moment screen. Back
returns to 拼车 with the row deselected."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from ride import open_list  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRides', 'history']

ui = UI(*sys.argv[1:])
open_list(ui)
row = ui.element('ride-list-history')
assert row.get('AXLabel') == ui.tn('ride.list.history', 3), row.get('AXLabel')
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
print('PASS: history row, 去过的 list newest first, back to 拼车')
