"""From 微信收款码 the sheet shows WeChat's save steps; a WeChat wxp:// receive code (injected at the decode boundary, so the `injected-` captures skip the system photo picker) confirms with 发布者会看到 微信收款码 and no wallet-switch line; saving without the name shows the name error, and once the name is typed the line reads 发布者会看到：name · wallet and saving adds the WeChat row."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from payee import WECHAT, open_payee, save_wallet_qr  # noqa: E402

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
ARGS = ['-uiVerifyFixture', 'one', '-uiVerifyQr', 'wechat', '-uiVerifySignedIn', 'onboarded']
STEP = {'zh-Hans': '「二维码收款」', 'ms': 'Terima Wang'}

ui = UI(*sys.argv[1:])
open_payee(ui)
save_wallet_qr(ui, WECHAT, 'wechat', STEP, prefix='injected-')
print('PASS: WeChat receive code confirmed without a wallet switch and saved')
