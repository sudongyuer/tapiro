"""After a payer taps 付不了 on the bank account, 我的 shows a red dot read as 有人付不了，去检查收款方式; 收款方式 opens with a yellow 有人付不了你的 Maybank 账户 card naming the masked number above the 90-day card (which waits its turn); 检查这个收款方式 opens the bank form, and 没问题，保留 clears the card, after which the stale TNG code's 90-day card shows."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_colour, assert_touch_target, by_id, close, token  # noqa: E402
from payee import open_payee  # noqa: E402

DEPS = [
    'src/features/payee/',
    'src/app/payee/',
    'src/app/(tabs)/me/',
    'src/features/account/MeView.tsx',
    'src/ui/NoticeCard.tsx',
    'verification/ui/payee.py',
]

LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyPayeeReported', '1']
ui = UI(*sys.argv[1:])


def red_dot():
    items = ui.read()
    row = by_id(items, 'me-payee')
    label = ' '.join((i.get('AXLabel') or '') for i in (row, by_id(items, 'me-payee-dot')) if i)
    assert ui.t('payee.meRowReported') in label, f'the 收款方式 row does not say someone could not pay: {label!r}'
    shot = ui.snap('00-me')
    red = shot.count(row['frame'], lambda rgb: close(rgb, token('--color-urgent', ui.appearance), 24))
    assert red > 20, f'red dot not drawn on the 收款方式 row ({red} pixels)'


open_payee(ui, red_dot)
card = ui.wait_label('payee-reported', lambda label: '4821' in label, 'the reported card does not name the bank account')
label = card.get('AXLabel') or ''
assert '1234564821' not in label, f'the reported card shows the full account number: {label!r}'
items = ui.read()
assert by_id(items, 'payee-recheck') is None, 'the 90-day card shows alongside the reported card'
for identifier in ('payee-reported-check', 'payee-reported-fine'):
    assert_touch_target(by_id(items, identifier), identifier)
shot = ui.snap('01-reported')
f = card['frame']
assert_colour(shot, {'x': f['x'] + 4, 'width': 8, 'y': f['y'] + f['height'] / 2, 'height': 8},
              token('--color-warning-fill', ui.appearance), 'reported card fill', tolerance=10)

ui.tap('payee-reported-check')
ui.element('payee-bank-sheet')
account = ui.element('payee-account-input')
assert account.get('AXValue') == '1234564821', f'the bank form did not open on the reported account: {account.get("AXValue")!r}'
ui.capture('02-check')
ui.tap_label(ui.t('payee.close'))
ui.gone('payee-bank-sheet')

ui.tap('payee-reported-fine')
ui.gone('payee-reported')
ui.element('payee-recheck')
assert by_id(ui.read(), 'payee-action-failed') is None, '没问题 showed 没成功'
ui.capture('03-fine')
print('PASS: the reported card leads, opens the form, and clears on 没问题')
