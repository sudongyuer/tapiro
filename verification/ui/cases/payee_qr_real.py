"""Real photo picker path, nothing injected: the case adds generated QR PNGs from verification/ui/media to the Simulator photo library (`simctl addmedia`), the app runs without `-uiVerifyQr` so expo-image-picker and expo-camera scanFromURLAsync decode the picked image, and the out-of-process system picker is driven by a coordinate tap on the cell whose tint matches the image (each PNG has its own light-module colour, because the picker does not order same-second imports predictably and the library is never reset). An Alipay receive code picked from 支付宝收钱码 confirms as 支付宝收钱码, asks for the name Alipay shows, and saves with it; a DuitNow TNG code picked from TNG 收款码 confirms as NURUL AINA BINTI AHMAD · TNG and saves."""
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from driver import UI, close  # noqa: E402
from payee import ALIPAY, SAVE, SEEN_WALLET, TNG, WALLET_PAYEE, add_from_menu, fill_wallet_name, open_payee, row_labels  # noqa: E402

DEPS = [
    'src/features/payee/',
    'src/app/payee/',
    'src/app/(tabs)/_layout.tsx',
    'src/app/(tabs)/me/',
    'src/features/account/',
    'src/features/shell/',
    'verification/ui/payee.py',
    'verification/ui/media/',
]

ARGS = ['-uiVerifyFixture', 'one', '-uiVerifySignedIn', 'onboarded']
BUDGET = 240
MEDIA = Path(__file__).resolve().parents[1] / 'media'
TNG_SEEN = '发布者会看到：NURUL AINA BINTI AHMAD · TNG'

ui = UI(*sys.argv[1:])


def find_cell(name, tint):
    deadline = time.monotonic() + 30
    while time.monotonic() < deadline:
        shot = ui.snap(name)
        for y in range(140, 860, 4):
            for x in range(4, 398, 4):
                if all(close(shot.rgb(x + dx, y + dy), tint, 24) for dx in (0, 6) for dy in (0, 6)):
                    return x + 3, y + 3
        time.sleep(1)  # picker sheet still sliding in
    raise AssertionError(f'system picker shows no cell tinted {tint}')


def pick_real(image, tint, entry, seen, step, wallet=None):
    before = row_labels(ui.read())
    subprocess.run(['xcrun', 'simctl', 'addmedia', ui.udid, str(MEDIA / image)], check=True, timeout=30)
    add_from_menu(ui, entry)
    ui.element('payee-qr-sheet')
    ui.tap('payee-qr-pick')
    ui.tap_point(*find_cell(f'{step}-picker', tint))
    ui.wait_label('payee-qr-seen', lambda label: label == seen, f'decoded confirm line is not {seen!r}', timeout=45)
    if wallet:
        fill_wallet_name(ui, wallet)
    ui.capture(f'{step}-confirm')
    ui.tap_label(SAVE[ui.locale])
    ui.gone('payee-qr-confirm')
    items = ui.wait(lambda items: len(row_labels(items)) == len(before) + 1 and items, f'{entry[ui.locale]} row did not appear')
    added = [row for row in row_labels(items) if row not in before]
    assert len(added) == 1 and entry[ui.locale] in added[0], f'new row is not {entry[ui.locale]}: {added}'
    assert not wallet or WALLET_PAYEE in added[0], f'new row lacks the typed name: {added}'
    return added[0]


open_payee(ui)
pick_real('real-alipay.png', (0xB8, 0xE4, 0xFF), ALIPAY, SEEN_WALLET[ui.locale].format(ALIPAY[ui.locale]), '01-alipay', 'alipay')
row = pick_real('real-duitnow-tng.png', (0xFF, 0xD8, 0xA8), TNG, TNG_SEEN, '02-tng')
assert 'NURUL AINA BINTI AHMAD' in row, row
ui.capture('03-saved')
print('PASS: real picker decoded an Alipay and a DuitNow TNG screenshot and both were saved')
