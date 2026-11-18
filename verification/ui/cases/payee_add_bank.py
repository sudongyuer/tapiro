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
# Each pad entry may wait 8 s for a pad the tree does not list (keys.on_pad); 260 s ran out with three (2026-11-18).
BUDGET = 300
ERRORS = {
    'bank': 'payee.form.error.bankEmpty',
    'account': 'payee.form.error.accountInvalid',
    'name': 'payee.form.error.nameEmpty',
    'bankName': 'payee.form.error.bankNameEmpty',
}
HOLDER = 'TANMEILING'

ui = UI(*sys.argv[1:])


# Pad taps carry no check of their own, and under load some were lost (2 of 6 deletes and the 3 of 1234564821, ms,
# 2026-11-18), so a field that reads wrong is cleared and typed once more.
def typed(identifier, text):
    for attempt in range(2):
        ui.tap(identifier)
        if attempt:
            ui.backspace(len((by_id(ui.read(), identifier) or {}).get('AXValue') or '') + 2)
        ui.type(text)
        try:
            ui.wait(lambda items: (by_id(items, identifier) or {}).get('AXValue') == text,
                    f'{identifier} does not read {text!r}', 10 if attempt == 0 else 30)
            return
        except AssertionError:
            if attempt:
                raise


def pick_bank(label):
    picker = ui.element('payee-bank-picker')['frame']
    ui.tap_point(picker['x'] + picker['width'] - 60, picker['y'] + picker['height'] / 2)
    ui.tap_label(label)


def error(kind):
    ui.wait_label('payee-form-error', lambda label: ui.t(ERRORS[kind]) in label, f'{kind} error not shown')


def save():
    ui.tap_label(ui.t(SAVE))


open_payee(ui)
ui.element('payee-empty')
add_from_menu(ui, BANK)
ui.element('payee-bank-sheet')
save()
error('bank')
ui.capture('01-bank-required')

pick_bank('Maybank')
ui.wait(lambda items: not any(i.get('AXLabel') == ui.t('payee.form.bankPlaceholder') for i in items), 'bank placeholder still shown')
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
items = ui.read()
for identifier, key in (('payee-account-input', 'payee.form.accountLabel'), ('payee-name-input', 'payee.form.nameLabel')):
    field = by_id(items, identifier)
    assert field.get('AXLabel') == ui.t(key), f'the filled {identifier} reads {field.get("AXLabel")!r}, not {ui.t(key)!r}'
    title = next((i for i in items if i.get('AXUniqueId') != identifier
                  and (i.get('AXLabel') or '').casefold() == ui.t(key).casefold()), None)
    assert title and title['frame']['y'] < field['frame']['y'], f'no visible {ui.t(key)!r} title above the filled {identifier}'
ui.capture('04-filled')
save()
ui.gone('payee-bank-sheet')
items = ui.wait(lambda items: row_labels(items) and items, 'saved bank row did not appear')
rows = row_labels(items)
assert len(rows) == 1, f'expected one row, got {rows}'
for part in ('Maybank', '•••• 4821', HOLDER, ui.t(DEFAULT)):
    assert part in rows[0], f'row is missing {part!r}: {rows[0]!r}'
assert '1234564821' not in rows[0], f'account number is not masked: {rows[0]!r}'
ui.capture('05-saved-maybank')

add_from_menu(ui, BANK)
ui.element('payee-bank-sheet')
pick_bank(ui.t('payee.form.otherBank'))
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
assert ui.t(DEFAULT) not in added[0], f'second method took the default: {added[0]!r}'
ui.capture('07-saved-other')
print('PASS: bank form validates, saves a listed bank and an other bank with masked last four')
