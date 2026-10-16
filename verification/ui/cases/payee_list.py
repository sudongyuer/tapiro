"""我的 shows a red dot for a stale QR; 收款方式 lists the default mark, a masked bank number, the yellow re-check banner and the cash toggle above the accessory; the + menu puts Alipay, WeChat and TNG first; re-picking the stale TNG code with an Alipay screenshot confirms the switch and replaces the row. The Alipay pick is injected at the decode boundary (`-uiVerifyQr`), so the photo picker never opens and the switch and replaced captures carry the `injected-` prefix."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, assert_colour, assert_touch_target, by_id, close, token  # noqa: E402
from driver import accessory  # noqa: E402
from payee import ALIPAY, DEFAULT, MENU_ORDER, SAVE, TNG, fill_wallet_name, open_menu, open_payee, row_labels  # noqa: E402

LOCALES = ['zh-Hans', 'ms']
BUDGET = 260
ARGS = ['-uiVerifyQr', 'alipay', '-uiVerifySignedIn', 'onboarded']
MISMATCH = {'zh-Hans': '这是支付宝的码，按支付宝收钱码保存？', 'ms': 'Ini kod Alipay. Simpan sebagai Kod Terima Alipay?'}

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
assert rows[2].count('TNG') == 1 and TNG[ui.locale] in rows[2], f'TNG row should name the wallet once: {rows[2]!r}'
for identifier in ('payee-recheck-action', 'payee-cash'):
    assert_touch_target(by_id(items, identifier), identifier)
cash = by_id(items, 'payee-cash')
assert str(cash.get('AXValue')) == '1', f'cash toggle is {cash.get("AXValue")}'

shot = ui.snap('01-list')
banner = by_id(items, 'payee-recheck')['frame']
assert_colour(shot, {'x': banner['x'] + 4, 'width': 8, 'y': banner['y'] + banner['height'] / 2, 'height': 8}, token('--color-warning-fill', ui.appearance),
              're-check banner fill', tolerance=10)
assert_appearance(shot.path, ui.appearance, 20, 2500, 'screen background')

ui.tap('payee-recheck-action')
ui.tap('payee-qr-pick')
ui.wait_label('payee-qr-mismatch', lambda label: MISMATCH[ui.locale] in label, 'wallet switch was not confirmed')
fill_wallet_name(ui, 'alipay')
ui.capture('injected-02-switch')
ui.tap_label(SAVE[ui.locale])
ui.gone('payee-qr-confirm')
items = ui.wait(lambda items: any(ALIPAY[ui.locale] in r for r in row_labels(items)) and items, 'Alipay row did not replace the TNG row')
rows = row_labels(items)
assert len(rows) == 3 and not any(TNG[ui.locale] in r for r in rows), rows
ui.gone('payee-recheck', timeout=5)
ui.capture('injected-03-replaced')

items = ui.read()
cash, bar = by_id(items, 'payee-cash'), accessory(items)
if bar:
    assert cash['frame']['y'] + cash['frame']['height'] <= bar['frame']['y'], f'cash row {cash["frame"]} sits under the accessory {bar["frame"]}'
ui.tap('payee-cash')
ui.wait(lambda items: str((by_id(items, 'payee-cash') or {}).get('AXValue')) == '0', 'cash did not turn off')
ui.capture('04-cash-off')

open_menu(ui)
items = ui.read()
ys = []
for labels in MENU_ORDER[:-1]:
    found = [i['frame']['y'] for i in items if i.get('AXLabel') == labels[ui.locale]]
    assert found, f'menu is missing {labels[ui.locale]}'
    ys.append(min(found))
assert ys == sorted(ys), f'menu order is wrong: {ys}'
ui.capture('05-menu')
print('PASS: list states, QR replacement, accessory clearance and menu order')
