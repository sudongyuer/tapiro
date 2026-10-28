"""Real photo picker path, nothing injected: the case adds generated QR PNGs from verification/ui/media to the Simulator photo library (`simctl addmedia`), the app runs without `-uiVerifyQr` so expo-image-picker and expo-camera scanFromURLAsync decode the picked image, and the out-of-process system picker is driven by a coordinate tap on the cell whose tint matches the image (each PNG has its own light-module colour, because the picker does not order same-second imports predictably and the library is never reset). Each image is added
once per Simulator (the UDID marker in `.verify/qr-media/`), so the library stops growing; the picker lists the oldest
photos first, so the case still scrolls the grid until a cell with that tint is in view. An Alipay receive code picked from 支付宝收钱码 confirms as 支付宝收钱码, asks for the name Alipay shows, and saves with it; a DuitNow TNG code picked from TNG 收款码 confirms as NURUL AINA BINTI AHMAD · TNG and saves."""
import subprocess
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from driver import UI, close  # noqa: E402
from payee import ALIPAY, SAVE, TNG, WALLET_PAYEE, add_from_menu, fill_wallet_name, open_payee, row_labels  # noqa: E402

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
ALIPAY_TINT = (0xB8, 0xE4, 0xFF)
TNG_TINT = (0xFF, 0xD8, 0xA8)
TINTS = (ALIPAY_TINT, TNG_TINT)
GRID_TOP = 160
TOOLBAR = 94
MAX_SWIPES = 30
ADDED = Path(__file__).resolve().parents[3] / '.verify' / 'qr-media'

ui = UI(*sys.argv[1:])


def screen_size():
    app = next((i for i in ui.read() if i.get('type') == 'Application'), None)
    assert app, 'the accessibility tree has no application frame'
    return app['frame']['width'], app['frame']['height']


def tinted(shot, tint):
    width, height = SCREEN
    for y in range(GRID_TOP, round(height) - TOOLBAR, 4):
        for x in range(4, round(width) - 4, 4):
            if all(close(shot.rgb(x + dx, y + dy), tint, 24) for dx in (0, 6) for dy in (0, 6)):
                return x + 3, y + 3
    return None


def find_cell(name, tint):
    deadline = time.monotonic() + 30
    while not any(tinted(ui.snap(name), media) for media in TINTS):
        if time.monotonic() > deadline:
            raise AssertionError('the system picker never showed a generated QR')
        time.sleep(1)
    for swipe in range(MAX_SWIPES + 1):
        ui.at_rest('the picker never came to rest')
        shot = ui.snap(f'{name}-{swipe:02d}')
        if found := tinted(shot, tint):
            return found
        width, height = SCREEN
        ui.swipe((width / 2, height * 0.8), (width / 2, height * 0.29), duration=0.3)
    raise AssertionError(f'system picker shows no cell tinted {tint} after {MAX_SWIPES} swipes; if this Simulator '
                         f'was erased, delete {marker()} so the images are added again')


def marker():
    return ADDED / ui.udid


def add_once(image):
    path = marker()
    added = set(path.read_text().split()) if path.exists() else set()
    if image in added:
        return
    subprocess.run(['xcrun', 'simctl', 'addmedia', ui.udid, str(MEDIA / image)], check=True, timeout=30)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text('\n'.join(sorted(added | {image})) + '\n')


def pick_real(image, tint, entry, seen, step, wallet=None):
    before = row_labels(ui.read())
    add_once(image)
    add_from_menu(ui, entry)
    ui.element('payee-qr-sheet')
    ui.tap('payee-qr-pick')
    ui.tap_point(*find_cell(f'{step}-picker', tint))
    ui.wait_label('payee-qr-seen', lambda label: label == seen, f'decoded confirm line is not {seen!r}', timeout=45)
    if wallet:
        fill_wallet_name(ui, wallet)
    ui.capture(f'{step}-confirm')
    ui.tap_label(ui.t(SAVE))
    ui.gone('payee-qr-confirm')
    items = ui.wait(lambda items: len(row_labels(items)) == len(before) + 1 and items, f'{ui.t(entry)} row did not appear')
    added = [row for row in row_labels(items) if row not in before]
    assert len(added) == 1 and ui.t(entry) in added[0], f'new row is not {ui.t(entry)}: {added}'
    assert not wallet or WALLET_PAYEE in added[0], f'new row lacks the typed name: {added}'
    return added[0]


open_payee(ui)
SCREEN = screen_size()
pick_real('real-alipay.png', ALIPAY_TINT, ALIPAY, ui.t('payee.qr.seenWallet', method=ui.t(ALIPAY)), '01-alipay', 'alipay')
row = pick_real('real-duitnow-tng.png', TNG_TINT, TNG, ui.t('payee.qr.seen', name='NURUL AINA BINTI AHMAD', bank='TNG'), '02-tng')
assert 'NURUL AINA BINTI AHMAD' in row, row
ui.capture('03-saved')
print('PASS: real picker decoded an Alipay and a DuitNow TNG screenshot and both were saved')
