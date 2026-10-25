"""Swiping the default payee row left reveals the system Delete action; tapping it removes the row at once and the oldest remaining transfer method becomes the default."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from payee import DEFAULT, open_payee, row_labels  # noqa: E402

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
BUDGET = 220
ARGS = ['-uiVerifySignedIn', 'onboarded']
DELETE = {'zh-Hans': '删除', 'ms': 'Padam'}

ui = UI(*sys.argv[1:])
open_payee(ui)
items = ui.wait(lambda items: len(row_labels(items)) == 3 and items, 'expected three transfer methods')
rows = row_labels(items)
assert DEFAULT[ui.locale] in rows[0] and '+60 12-345 6789' in rows[0], f'first row is not the default phone: {rows[0]!r}'
first = next(i for i in items if (i.get('AXUniqueId') or '').startswith('payee-row-') and DEFAULT[ui.locale] in (i.get('AXLabel') or ''))
ui.capture('01-before')

frame = first['frame']
y = frame['y'] + frame['height'] / 2
ui.swipe((frame['x'] + frame['width'] - 24, y), (frame['x'] + 40, y), duration=0.4)
ui.labelled(DELETE[ui.locale])
ui.capture('02-swiped')
ui.tap_label(DELETE[ui.locale])

items = ui.wait(lambda items: len(row_labels(items)) == 2 and items, 'the swiped row was not removed')
rows = row_labels(items)
assert all('+60 12-345 6789' not in row for row in rows), f'the deleted phone row is still listed: {rows}'
assert '•••• 4821' in rows[0] and DEFAULT[ui.locale] in rows[0], f'the oldest remaining method did not become the default: {rows[0]!r}'
assert DEFAULT[ui.locale] not in rows[1], f'more than one default after delete: {rows}'
ui.capture('03-after')
print('PASS: swipe delete removed the default phone and moved the default to the bank account')
