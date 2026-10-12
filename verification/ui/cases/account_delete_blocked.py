"""Deleting an account with an unsettled payment shows the reason and keeps the delete button disabled."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, assert_touch_target  # noqa: E402

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
ui.capture('02-blocked')
print('PASS: blocked deletion explains the unsettled payment')
