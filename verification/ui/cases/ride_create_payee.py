"""Without a payee method the confirm page explains 「到了大家直接付给你。先加一个收款方式，现金也行。」 and the button
becomes 「去加收款方式」 (206 A, 230): it opens 收款方式 as a sheet over the confirm step without leaving 拼车, and closing it
lands back on the confirm step (audit R1)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from apply import title_shown  # noqa: E402
from driver import UI, by_id  # noqa: E402
from ride import open_confirm, open_list  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/ride-create/', 'src/app/payee/', 'verification/ui/ride.py',
        'verification/ui/apply.py', 'src/ui/NoticeCard.tsx']


def selected_me(items):
    return str((by_id(items, 'tab-me') or {}).get('AXValue')) == '1'
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
ui.element('payee-screen')
title_shown(ui, 'payee.title')
assert not selected_me(ui.read()), '去加收款方式 switched to 我的'
ui.at_rest()
ui.capture('02-payee-over-confirm')
ui.tap_label(ui.t('payee.close'))
ui.gone('payee-screen')
ui.element('ride-confirm-add-payee')
ui.capture('03-back-on-confirm')
print('PASS: no payee method explains; 收款方式 opens over the confirm step and closing it returns there')
