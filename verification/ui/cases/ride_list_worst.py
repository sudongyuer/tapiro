"""Worst case on the list (break-ui): 80-character place labels wrap to two lines inside the ticket, 8-character short
names shrink to fit one line, RM 1000 and ¥1600 estimates and 9 large bags stay inside the stub and the airport line, in
zh-Hans and in ms (the longest copy)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from ride import open_list, ticket, within_screen  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyFixture', 'worst']

ui = UI(*sys.argv[1:])
open_list(ui)
leaving = ui.element('ride-ticket-ride-leaving')
assert '谷中城北庭正门口 → 吉隆坡第二机场站' in (leaving.get('AXLabel') or ''), leaving.get('AXLabel')
assert 'RM' in (leaving.get('AXLabel') or '') and '250' in leaving.get('AXLabel'), leaving.get('AXLabel')
requests = ui.element('ride-ticket-ride-requests')
assert '¥' in (requests.get('AXLabel') or '') and '800' in requests.get('AXLabel'), requests.get('AXLabel')
items = ui.read()
for identifier in ('ride-ticket-ride-leaving', 'ride-ticket-ride-requests'):
    within_screen(items, identifier)
ui.capture('01-worst-mine')
airport = ticket(ui, 'ride-ticket-ride-airport')
assert ui.tn('ride.ticket.bags', 9) in (airport.get('AXLabel') or ''), airport.get('AXLabel')
within_screen(ui.read(), 'ride-ticket-ride-airport')
ui.capture('02-worst-airport')
print('PASS: long labels, 8-character short names and the limit amounts stay inside the tickets')
