"""From 支付宝收钱码 the sheet shows Alipay's save steps; an Alipay receive code (injected at the decode boundary, so the `injected-` captures skip the system photo picker) confirms with 发布者会看到 支付宝收钱码 and no wallet-switch line; saving without the name shows the name error, and once the name is typed the line reads 发布者会看到：name · wallet and saving adds the Alipay row."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from payee import ALIPAY, open_payee, save_wallet_qr  # noqa: E402

LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyFixture', 'one', '-uiVerifyQr', 'alipay', '-uiVerifySignedIn', 'onboarded']
STEP = {'zh-Hans': '首页「收钱」', 'ms': 'Terima (收钱)'}

ui = UI(*sys.argv[1:])
open_payee(ui)
save_wallet_qr(ui, ALIPAY, 'alipay', STEP, prefix='injected-')
print('PASS: Alipay receive code confirmed without a wallet switch and saved')
