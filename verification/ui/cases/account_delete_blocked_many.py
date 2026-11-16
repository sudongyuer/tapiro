"""Deleting an account with six unsettled payments: the reason and the list scroll inside the sheet body while 删除账号
and 取消 stay on screen, and the last payment can be scrolled above the buttons."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, bottom, by_id  # noqa: E402
from gestures import drag  # noqa: E402

DEPS = ['src/features/account/', 'src/app/delete-account.tsx', 'src/debug/AccountScenes.tsx', 'verification/ui/gestures.py']

SCENE = 'delete-blocked'
ARGS = ['-uiVerifyDeletion', 'blockedMany']
LOCALES = ['zh-Hans', 'ms']
PAYMENT = 'delete-account-payment-00000000-0000-4000-8000-0000000000a'
BUTTONS = ('delete-account-confirm', 'delete-account-cancel')


def assert_buttons_on_screen(items, when):
    height = items[0]['frame']['height']
    for identifier in BUTTONS:
        button = by_id(items, identifier)
        assert button is not None, f'{identifier} is missing {when}'
        assert_touch_target(button, identifier)
        assert bottom(button) <= height, f'{identifier} is off screen {when}: {button["frame"]} on a {height} pt screen'
    return by_id(items, BUTTONS[0])['frame']


def visible(items, identifier, limit):
    row = by_id(items, identifier)
    return row is not None and bottom(row) <= limit


ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
ui.tap('delete-account-confirm')
ui.element('delete-account-message-blocked', timeout=10)
ui.at_rest()
items = ui.read()
confirm = assert_buttons_on_screen(items, 'with six payments')
assert visible(items, PAYMENT + '1', confirm['y']), 'the first unsettled payment is not shown above the buttons'
assert not visible(items, PAYMENT + '6', confirm['y']), 'six payments fit without scrolling; the fixture no longer overflows'
ui.capture('01-blocked-top')

width = items[0]['frame']['width']
for _ in range(6):
    if visible(ui.read(), PAYMENT + '6', confirm['y']):
        break
    drag(ui, (width / 2, confirm['y'] - 120), (width / 2, confirm['y'] - 420))
ui.at_rest()
items = ui.read()
assert visible(items, PAYMENT + '6', confirm['y']), 'the payment list does not scroll to its last row'
after = assert_buttons_on_screen(items, 'after scrolling')
assert after == confirm, f'the buttons moved with the list: {confirm} then {after}'
ui.capture('02-blocked-end')
print('PASS: six unsettled payments scroll inside the sheet and both buttons stay on screen')
