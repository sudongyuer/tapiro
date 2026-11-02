"""Without a payee method the confirm page explains 「到了大家直接付给你。先加一个收款方式，现金也行。」 and the button
becomes 「去加收款方式」 (206 A, 230): it closes the sheet onto 收款方式, and the next ＋ opens the kept draft."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from ride import open_confirm, open_create, open_list  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/ride-create/', 'verification/ui/ride.py', 'src/ui/NoticeCard.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDraft', 'airport',
        '-uiVerifyRidePayee', 'none']

ui = UI(*sys.argv[1:])
open_list(ui)
open_confirm(ui)
notice = ui.element('ride-confirm-no-payee')
assert ui.t('ride.create.confirm.noPayee') in (notice.get('AXLabel') or ''), notice.get('AXLabel')
button = ui.element('ride-confirm-add-payee')
assert button.get('AXLabel') == ui.t('ride.create.confirm.addPayee'), button.get('AXLabel')
assert by_id(ui.read(), 'ride-confirm-publish') is None, '发出去 is offered without a payee method'
ui.capture('01-no-payee')
ui.tap('ride-confirm-add-payee')
ui.gone('ride-confirm')
ui.element('payee-screen')
ui.capture('02-payee')
ui.tap('tab-ride')
ui.element('ride-screen')
assert open_create(ui).get('AXUniqueId') == 'ride-form', 'the kept draft did not reopen the form'
print('PASS: no payee method explains and routes to 收款方式; the draft is kept')
