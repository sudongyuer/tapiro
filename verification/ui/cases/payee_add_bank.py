"""From 银行账户 in the + menu: the bank is required, the account number must be digits only, the name is required; saving shows bank and masked last four. Picking 其他银行 asks for a typed bank name, which the row then shows."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from payee import BANK, DEFAULT, SAVE, add_from_menu, open_payee, row_labels  # noqa: E402

DEPS = [
    'src/features/payee/',
    'src/app/payee/',
    'src/app/(tabs)/_layout.tsx',
    'src/app/(tabs)/me/',
    'src/features/account/',
    'src/features/shell/',
    'verification/ui/payee.py',
]

LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyFixture', 'empty', '-uiVerifySignedIn', 'onboarded']
BUDGET = 260
PICK_BANK = {'zh-Hans': '选择银行', 'ms': 'Pilih Bank'}
OTHER = {'zh-Hans': '其他银行', 'ms': 'Bank Lain'}
ERRORS = {
    'bank': {'zh-Hans': '请选择银行', 'ms': 'Pilih bank.'},
    'account': {'zh-Hans': '账号是 6 到 20 位数字', 'ms': 'Nombor akaun ialah 6 hingga 20 digit.'},
    'name': {'zh-Hans': '请填银行显示的名字', 'ms': 'Masukkan nama yang dipaparkan oleh bank.'},
    'bankName': {'zh-Hans': '请填银行名称', 'ms': 'Masukkan nama bank.'},
}
HOLDER = 'TANMEILING'

ui = UI(*sys.argv[1:])


def typed(identifier, text):
    ui.tap(identifier)
    ui.type(text)
    ui.wait(lambda items: (by_id(items, identifier) or {}).get('AXValue') == text, f'{identifier} does not read {text!r}')


def pick_bank(label):
    picker = ui.element('payee-bank-picker')['frame']
    ui.tap_point(picker['x'] + picker['width'] - 60, picker['y'] + picker['height'] / 2)
    ui.tap_label(label)


def error(kind):
    ui.wait_label('payee-form-error', lambda label: ERRORS[kind][ui.locale] in label, f'{kind} error not shown')


def save():
    ui.tap_label(SAVE[ui.locale])


open_payee(ui)
ui.element('payee-empty')
add_from_menu(ui, BANK)
ui.element('payee-bank-sheet')
save()
error('bank')
ui.capture('01-bank-required')

pick_bank('Maybank')
ui.wait(lambda items: not any(i.get('AXLabel') == PICK_BANK[ui.locale] for i in items), 'bank placeholder still shown')
typed('payee-account-input', 'ABC123')
save()
error('account')
ui.capture('02-account-digits-only')
ui.tap('payee-account-input')
ui.backspace(6)
typed('payee-account-input', '1234564821')
save()
error('name')
ui.capture('03-name-required')
typed('payee-name-input', HOLDER)
ui.capture('04-filled')
save()
ui.gone('payee-bank-sheet')
items = ui.wait(lambda items: row_labels(items) and items, 'saved bank row did not appear')
rows = row_labels(items)
assert len(rows) == 1, f'expected one row, got {rows}'
for part in ('Maybank', '•••• 4821', HOLDER, DEFAULT[ui.locale]):
    assert part in rows[0], f'row is missing {part!r}: {rows[0]!r}'
assert '1234564821' not in rows[0], f'account number is not masked: {rows[0]!r}'
ui.capture('05-saved-maybank')

add_from_menu(ui, BANK)
ui.element('payee-bank-sheet')
pick_bank(OTHER[ui.locale])
ui.element('payee-bank-name-input')
typed('payee-account-input', '98765432100')
typed('payee-name-input', HOLDER)
save()
error('bankName')
ui.capture('06-bank-name-required')
typed('payee-bank-name-input', 'Bank Rakyat')
save()
ui.gone('payee-bank-sheet')
items = ui.wait(lambda items: len(row_labels(items)) == 2 and items, 'other-bank row did not appear')
added = [row for row in row_labels(items) if 'Maybank' not in row]
assert len(added) == 1, f'expected one new row, got {added}'
for part in ('Bank Rakyat', '•••• 2100', HOLDER):
    assert part in added[0], f'row is missing {part!r}: {added[0]!r}'
assert DEFAULT[ui.locale] not in added[0], f'second method took the default: {added[0]!r}'
ui.capture('07-saved-other')
print('PASS: bank form validates, saves a listed bank and an other bank with masked last four')
