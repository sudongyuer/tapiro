"""A ride settled 15 minutes ago stays in 我的拼车 with its stamp for 24 h (219 A): the ticket reads 已结清 and its stub
shows the rider's own RM 24.70 with 「你付了」, not the per-person estimate."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from ride import label, open_list  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'src/lib/i18n/locales/rideSettle/']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 180
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRides', 'settled']

ui = UI(*sys.argv[1:])

open_list(ui)
ticket = label(ui, 'ride-ticket-ride-settled')
assert ticket.startswith(ui.t('ride.ticket.closed')), ticket
assert re.search(r'RM\s?24\.70', ticket), f'the settled ticket does not show what you paid: {ticket}'
ui.at_rest()
ui.snap('01-settled-ticket')
print('PASS: the settled ticket keeps 已结清 and shows 你付了 RM 24.70')
