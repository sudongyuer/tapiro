"""The real delete-account form sheet from Settings with six unsettled payments: the sheet stays inside the screen and
scrolls as one, so the last payment and both buttons scroll into view (a form sheet's ScrollView fills the sheet)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, bottom, by_id, reach_home  # noqa: E402
from gestures import drag  # noqa: E402

DEPS = ['src/features/account/', 'src/app/delete-account.tsx', 'src/app/_layout.tsx', 'src/app/(tabs)/me/', 'verification/ui/gestures.py']

ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyDeletion', 'blockedMany']
BUDGET = 200
PAYMENT = 'delete-account-payment-00000000-0000-4000-8000-0000000000a'
BUTTONS = ('delete-account-confirm', 'delete-account-cancel')


def sheet_frame(items, when):
    sheet = by_id(items, 'delete-account-scroll')['frame']
    assert sheet['y'] >= 44, f'the sheet runs under the status bar {when}: {sheet}'
    assert bottom(sheet) <= items[0]['frame']['height'] + 1, f'the sheet runs off the screen {when}: {sheet}'
    return sheet


def on_screen(items, identifier, sheet):
    element = by_id(items, identifier)
    return element is not None and element['frame']['y'] >= sheet['y'] and bottom(element) <= bottom(sheet)


ui = UI(*sys.argv[1:])
reach_home(ui)
ui.tap('tab-me')
ui.tap('me-settings')
ui.tap('settings-delete')
ui.tap('delete-account-confirm')
ui.element('delete-account-message-blocked', timeout=10)
ui.at_rest()
items = ui.read()
sheet = sheet_frame(items, 'with six payments')
assert on_screen(items, PAYMENT + '1', sheet), 'the first unsettled payment is not shown'
assert not on_screen(items, BUTTONS[1], sheet), '取消 is on screen with six payments; the fixture no longer overflows'
ui.capture('01-blocked-top')

width = items[0]['frame']['width']
for _ in range(6):
    if on_screen(ui.read(), BUTTONS[1], sheet):
        break
    drag(ui, (width / 2, bottom(sheet) - 120), (width / 2, bottom(sheet) - 420))
ui.at_rest()
items = ui.read()
sheet_frame(items, 'after scrolling')
for identifier in (PAYMENT + '6', *BUTTONS):
    assert on_screen(items, identifier, sheet), f'{identifier} never scrolled into the sheet'
for identifier in BUTTONS:
    assert_touch_target(by_id(items, identifier), identifier)
ui.capture('02-blocked-end')
ui.tap('delete-account-cancel')
ui.gone('delete-account-confirm')
ui.element('settings-delete')
print('PASS: the delete sheet scrolls to its last payment and both buttons with six unsettled payments')
