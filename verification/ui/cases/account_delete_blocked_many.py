"""Deleting an account with six unsettled payments: the sheet scrolls as one, so the last payment, 删除账号 and 取消 can
be scrolled onto the screen."""
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


def on_screen(items, identifier):
    element = by_id(items, identifier)
    return element is not None and element['frame']['y'] >= 0 and bottom(element) <= items[0]['frame']['height']


ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
ui.tap('delete-account-confirm')
ui.element('delete-account-message-blocked', timeout=10)
ui.at_rest()
items = ui.read()
assert on_screen(items, PAYMENT + '1'), 'the first unsettled payment is not shown'
assert not on_screen(items, BUTTONS[1]), '取消 is on screen with six payments; the fixture no longer overflows'
ui.capture('01-blocked-top')

width, height = items[0]['frame']['width'], items[0]['frame']['height']
for _ in range(6):
    if on_screen(ui.read(), BUTTONS[1]):
        break
    drag(ui, (width / 2, height - 200), (width / 2, height - 500))
ui.at_rest()
items = ui.read()
for identifier in (PAYMENT + '6', *BUTTONS):
    assert on_screen(items, identifier), f'{identifier} never scrolled onto the screen'
for identifier in BUTTONS:
    assert_touch_target(by_id(items, identifier), identifier)
ui.capture('02-blocked-end')
print('PASS: six unsettled payments and both buttons scroll onto the screen')
