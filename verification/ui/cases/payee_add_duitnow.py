"""With no methods, adding a DuitNow phone from the + menu requires the bank name, then saves and shows the row as the default."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, by_id  # noqa: E402
from payee import DEFAULT, PHONE, SAVE, add_from_menu, open_payee, row_labels  # noqa: E402

LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyFixture', 'empty', '-uiVerifySignedIn', 'onboarded']
BUDGET = 220
NAME_ERROR = {'zh-Hans': '请填银行显示的名字', 'ms': 'Masukkan nama yang dipaparkan oleh bank.'}

ui = UI(*sys.argv[1:])
open_payee(ui)
ui.element('payee-empty')
ui.capture('01-empty')

add_from_menu(ui, PHONE)
ui.element('payee-phone-sheet')
ui.tap('payee-phone-input')
ui.type('0123456789')
ui.wait(lambda items: (by_id(items, 'payee-phone-input') or {}).get('AXValue') == '0123456789', 'phone not typed')
ui.tap_label(SAVE[ui.locale])
ui.wait_label('payee-form-error', lambda label: NAME_ERROR[ui.locale] in label, 'missing-name error not shown')
shot = ui.capture('02-name-required')
assert_appearance(shot, ui.appearance, 20, 2500, 'sheet background')

ui.tap('payee-name-input')
ui.type('TANMEILING')
ui.wait(lambda items: (by_id(items, 'payee-name-input') or {}).get('AXValue') == 'TANMEILING', 'name not typed')
ui.tap_label(SAVE[ui.locale])
ui.gone('payee-phone-sheet')
items = ui.wait(lambda items: row_labels(items) and items, 'saved method did not appear')
rows = row_labels(items)
assert len(rows) == 1, f'expected one row, got {rows}'
for part in ('+60 12-345 6789', 'TANMEILING', DEFAULT[ui.locale]):
    assert part in rows[0], f'row is missing {part!r}: {rows[0]!r}'
ui.gone('payee-empty', timeout=5)
ui.capture('03-saved')
print('PASS: name required, saved phone appears as the default')
