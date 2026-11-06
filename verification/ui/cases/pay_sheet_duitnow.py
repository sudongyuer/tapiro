"""A payee with only a DuitNow phone has that row preselected; the number and the TP- reference each copy (the pasteboard holds the copied value, 已复制 shows and the number's returns to 复制), the bank hint says 打开你的银行 App，选 DuitNow, and with nothing to convert there is no ¥ amount and no rate footer."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import copy_on_device, device_pasteboard  # noqa: E402
from driver import UI, by_id  # noqa: E402
from pay import method_ids, open_sheet, scroll_to  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py', 'verification/ui/bounty.py']
SCENE = 'pay-sheet'
# A 2 s 已复制 can close before the first read after an iOS 27.2 `axe tap --id` (README, -uiVerifyCopiedMs).
ARGS = ['-uiVerifyPayMethods', 'duitnow', '-uiVerifyCopiedMs', '8000']
LOCALES = ['zh-Hans', 'ms']
SENTINEL = 'pay-sheet-duitnow-sentinel'


def copy(ui, row, expected):
    copy_on_device(ui, SENTINEL)
    ui.tap(f'{row}-copy')
    ui.wait_label(f'{row}-copy', lambda label: ui.t('pay.sheet.copied') in label, f'{row} copy gave no feedback')
    board = device_pasteboard(ui)
    assert board == expected, f'{row} copy left {board!r} on the pasteboard, not {expected!r}'


ui = UI(*sys.argv[1:])
amount = open_sheet(ui)
assert '¥' not in (amount.get('AXLabel') or ''), 'a ¥ amount shown for DuitNow'
items = ui.read()
assert [m.split('-')[0] for m in method_ids(items)] == ['duitnow_id'], method_ids(items)
assert by_id(items, 'pay-rate-footer') is None, 'a rate footer is shown with nothing converted'
number = ui.element('pay-number-value')
assert '+60 12-345 6789' in (number.get('AXLabel') or ''), number.get('AXLabel')
ui.capture('01-preselected')
copy(ui, 'pay-number', '0123456789')
ui.wait_label('pay-number-copy', lambda label: ui.t('pay.sheet.copied') not in label and ui.t('pay.sheet.copy') in label,
              'number copy feedback never returned to 复制')
reference = scroll_to(ui, 'pay-reference-value')
code = re.search(r'TP-[A-HJ-NP-Z2-9]{4}', reference.get('AXLabel') or '')
assert code, reference.get('AXLabel')
copy(ui, 'pay-reference', code.group(0))
assert any(ui.t('pay.sheet.bankHint') in (i.get('AXLabel') or '') for i in ui.read()), 'bank hint missing'
ui.capture('02-copied')
print('PASS: single DuitNow method preselected; number and reference copied with feedback that clears')
