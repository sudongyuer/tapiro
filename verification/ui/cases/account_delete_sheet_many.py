"""The real delete-account form sheet from Settings with six unsettled payments: the sheet stays inside the screen, both
buttons stay reachable and the last payment scrolls into view above them."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, bottom, by_id, reach_home  # noqa: E402
from gestures import drag  # noqa: E402

DEPS = ['src/features/account/', 'src/app/delete-account.tsx', 'src/app/_layout.tsx', 'src/app/(tabs)/me/', 'verification/ui/gestures.py']

ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyDeletion', 'blockedMany']
BUDGET = 200
PAYMENT = 'delete-account-payment-00000000-0000-4000-8000-0000000000a'
BUTTONS = ('delete-account-confirm', 'delete-account-cancel')


def assert_sheet_fits(items, when):
    height = items[0]['frame']['height']
    sheet = by_id(items, 'delete-account-sheet')['frame']
    assert sheet['y'] >= 44, f'the sheet runs under the status bar {when}: {sheet}'
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
reach_home(ui)
ui.tap('tab-me')
ui.tap('me-settings')
ui.tap('settings-delete')
ui.tap('delete-account-confirm')
ui.element('delete-account-message-blocked', timeout=10)
ui.at_rest()
items = ui.read()
confirm = assert_sheet_fits(items, 'with six payments')
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
assert_sheet_fits(items, 'after scrolling')
ui.capture('02-blocked-end')
ui.tap('delete-account-cancel')
ui.gone('delete-account-confirm')
ui.element('settings-delete')
print('PASS: the delete sheet keeps its buttons on screen with six unsettled payments')
