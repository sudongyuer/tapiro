"""Worst case: the reported card names the longest bank name (Bank Kerjasama Rakyat … Cawangan Seri Kembangan) with its masked 20-digit account, wraps inside the list, and both of its buttons stay 44 pt."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from payee import open_payee  # noqa: E402

DEPS = ['src/features/payee/', 'src/app/payee/', 'src/ui/NoticeCard.tsx', 'verification/ui/payee.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyPayeeReported', '1', '-uiVerifyFixture', 'worst']
ui = UI(*sys.argv[1:])

open_payee(ui)
card = ui.wait_label('payee-reported', lambda label: 'Seri Kembangan' in label and '4821' in label,
                     'the reported card does not name the long bank account')
assert '12345678901234564821' not in (card.get('AXLabel') or ''), 'the full account number is shown'
items = ui.read()
screen = by_id(items, 'payee-screen')['frame']
f = card['frame']
assert f['x'] + f['width'] <= screen['x'] + screen['width'] + 1, f'the card runs off the screen: {f}'
for identifier in ('payee-reported-check', 'payee-reported-fine'):
    assert_touch_target(by_id(items, identifier), identifier)
ui.capture('01-long-bank')
print('PASS: the reported card wraps the longest bank name')
