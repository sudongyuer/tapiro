"""Attaching a screenshot and tapping 我已付款 turns the sheet into 等…确认 with 附了截图 in place; 撤回「我已付款」 brings back the method and the 我已付款 button."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from pay import open_sheet, scroll_to  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayMethods', 'duitnow']

ui = UI(*sys.argv[1:])
open_sheet(ui)
scroll_to(ui, 'pay-proof-add')
ui.tap('pay-proof-add')
ui.element('pay-proof-added')
mark = scroll_to(ui, 'pay-mark-paid')
assert_touch_target(mark, '我已付款')
ui.capture('01-before')
ui.tap('pay-mark-paid')
waiting = ui.wait_label('pay-waiting', lambda label: '等阿杰确认' in label and '附了截图' in label,
                        'waiting state missing or without the screenshot note')
items = ui.read()
assert by_id(items, 'pay-mark-paid') is None and by_id(items, 'pay-number-value') is None, 'pay steps still shown'
ui.capture('02-waiting')
ui.tap('pay-undo')
ui.element('pay-number-value')
scroll_to(ui, 'pay-mark-paid')
assert by_id(ui.read(), 'pay-waiting') is None, 'still waiting after undo'
ui.capture('03-undone')
print('PASS: 我已付款 waits in place and undo restores the pay step')
