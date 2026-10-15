"""我的 shows a red dot for a stale QR; 收款方式 lists seeded methods with the default mark, masked bank number, the yellow re-check banner and the cash toggle."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, assert_colour, assert_touch_target, by_id, close, token  # noqa: E402
from payee import DEFAULT, open_payee, row_labels  # noqa: E402

LOCALES = ['zh-Hans', 'ms']
BUDGET = 200

DUE = {'zh-Hans': '有收款码需要重新确认', 'ms': 'Kod QR perlu disemak semula'}

ui = UI(*sys.argv[1:])


def red_dot():
    items = ui.read()
    row = by_id(items, 'me-payee')
    dot = by_id(items, 'me-payee-dot')
    assert dot or DUE[ui.locale] in (row.get('AXLabel') or ''), f'no re-check dot on 我的: {row.get("AXLabel")!r}'
    shot = ui.snap('00-me')
    f = row['frame']
    red = shot.count(f, lambda rgb: close(rgb, token('--color-urgent', ui.appearance), 24))
    assert red > 20, f'red dot not drawn on the 收款方式 row ({red} pixels)'


open_payee(ui, red_dot)

items = ui.settled(lambda items: by_id(items, 'payee-recheck') and items and by_id(items, 'payee-recheck'),
                   're-check banner never settled')
items = ui.read()
rows = row_labels(items)
assert len(rows) == 3, f'expected three transfer methods, got {rows}'
assert DEFAULT[ui.locale] in rows[0] and '+60 12-345 6789' in rows[0], f'first row is not the default phone: {rows[0]!r}'
assert all(DEFAULT[ui.locale] not in row for row in rows[1:]), f'more than one default: {rows}'
assert '•••• 4821' in rows[1] and '1234564821' not in rows[1], f'bank number not masked: {rows[1]!r}'
assert "Touch 'n Go" in rows[2], f'QR row does not name the wallet: {rows[2]!r}'
for identifier in ('payee-recheck-action', 'payee-cash'):
    assert_touch_target(by_id(items, identifier), identifier)
cash = by_id(items, 'payee-cash')
assert str(cash.get('AXValue')) == '1', f'cash toggle is {cash.get("AXValue")}'

shot = ui.snap('01-list')
banner = by_id(items, 'payee-recheck')['frame']
assert_colour(shot, {'x': banner['x'] + 4, 'width': 8, 'y': banner['y'] + banner['height'] / 2, 'height': 8}, token('--color-warning-fill', ui.appearance),
              're-check banner fill', tolerance=10)
assert_appearance(shot.path, ui.appearance, 20, 2500, 'screen background')

ui.tap('payee-cash')
ui.wait(lambda items: str((by_id(items, 'payee-cash') or {}).get('AXValue')) == '0', 'cash did not turn off')
ui.capture('02-cash-off')
print('PASS: seeded list, default mark, masked bank, re-check banner and cash toggle')
