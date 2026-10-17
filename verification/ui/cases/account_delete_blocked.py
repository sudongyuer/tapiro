"""Deleting an account with an unsettled payment shows the reason and the payment, and keeps the delete button disabled."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, assert_touch_target  # noqa: E402

DEPS = ['src/features/account/', 'src/app/delete-account.tsx', 'src/debug/', 'src/app/debug/']

SCENE = 'delete-blocked'
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
confirm = ui.element('delete-account-confirm')
assert_touch_target(confirm, 'delete button')
shot = ui.capture('01-sheet')
assert_appearance(shot, ui.appearance, 20, 2500, 'screen background')
ui.tap('delete-account-confirm')
ui.element('delete-account-message-blocked', timeout=10)
payment = ui.element('delete-account-payment-00000000-0000-4000-8000-0000000000a1')
label = payment.get('AXLabel') or ''
for part in ('Mid Valley', '陈嘉欣', r'RM\s?12\.50'):
    assert re.search(part, label), f'unsettled payment row is missing {part!r}: {label!r}'
ui.capture('02-blocked')
print('PASS: blocked deletion names the unsettled payment')
