"""From 支付宝收钱码, the sheet shows Alipay's save steps; a picked paying code shows the red 付款码 card and saves nothing; a DuitNow screenshot next is accepted with a wallet-switch line and 发布者会看到 name · bank, and saving adds the row. Both picks are injected at the decode boundary (`-uiVerifyQr`), so the system photo picker never opens and every capture after 01 carries the `injected-` prefix."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_colour, by_id, token  # noqa: E402
from payee import ALIPAY, SAVE, add_from_menu, open_payee, row_labels  # noqa: E402

LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyFixture', 'one', '-uiVerifyQr', 'paying,duitnow', '-uiVerifySignedIn', 'onboarded']
BUDGET = 220
PAYING = {'zh-Hans': '这是付款码，不是收款码。', 'ms': 'Ini kod bayar, bukan kod terima.'}
STEP = {'zh-Hans': '首页「收钱」', 'ms': 'Terima (收钱)'}
MISMATCH = {'zh-Hans': '这是Maybank的码，按Maybank 收款码保存？', 'ms': 'Ini kod Maybank. Simpan sebagai Kod QR Maybank?'}
SEEN = {'zh-Hans': '发布者会看到：TAN MEI LING · Maybank', 'ms': 'Pembayar akan nampak: TAN MEI LING · Maybank'}

ui = UI(*sys.argv[1:])
open_payee(ui)
before = row_labels(ui.read())
assert len(before) == 1, f'fixture "one" should seed one method, got {before}'

add_from_menu(ui, ALIPAY)
ui.element('payee-qr-sheet')
ui.wait_label('payee-qr-steps', lambda label: STEP[ui.locale] in label, 'Alipay save steps missing')
ui.capture('01-pick')

ui.tap('payee-qr-pick')
card = ui.wait_label('payee-qr-error-payingCode', lambda label: PAYING[ui.locale] in label, 'paying-code card missing')
assert by_id(ui.read(), 'payee-qr-confirm') is None, 'a paying code reached the confirm step'
shot = ui.snap('injected-02-paying-code')
f = card['frame']
assert_colour(shot, {'x': f['x'] + 4, 'width': 8, 'y': f['y'] + f['height'] / 2, 'height': 8}, token('--color-urgent-fill', ui.appearance),
              'error card fill', tolerance=10)

ui.tap('payee-qr-pick')
ui.wait_label('payee-qr-seen', lambda label: label == SEEN[ui.locale], 'confirm line does not show name · bank')
ui.wait_label('payee-qr-mismatch', lambda label: MISMATCH[ui.locale] in label, 'wallet switch line missing')
ui.capture('injected-03-confirm')
ui.tap_label(SAVE[ui.locale])
ui.gone('payee-qr-confirm')
items = ui.wait(lambda items: len(row_labels(items)) == 2 and items, 'saved QR did not appear')
rows = row_labels(items)
assert any('TAN MEI LING' in row and 'Maybank' in row for row in rows), rows
assert not any('284567890123456789' in row for row in rows), rows
ui.capture('injected-04-saved')
print('PASS: paying code blocked and not saved; DuitNow QR confirmed and saved')
