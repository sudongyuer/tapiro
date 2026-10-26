"""A cash payee settles a due payment; the first 已收到 plays the full celebration (sticker peels off the receipt and flies into the sticker book, 第一次收款 badge, count 1, video), and 好的 returns to the settled sheet."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from celebration import assert_celebration  # noqa: E402
from driver import UI  # noqa: E402
from pay import open_sheet  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py', 'verification/ui/celebration.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayment', 'fixture-owed-cash', '-uiVerifyStickers', 'none']

ui = UI(*sys.argv[1:])
open_sheet(ui)
due = ui.element('pay-payee-due-cash')
assert ui.t('pay.payee.dueCash', name='小林') in (due.get('AXLabel') or ''), due.get('AXLabel')
ui.capture('01-cash-due')
ui.tap('pay-confirm')
assert_celebration(ui, first=True, count=1, title='帮带一杯咖啡', name='小林', amount=r'RM\s?8\.00', shot_name='02-celebration', cny=r'13\.07')
ui.tap('pay-celebration-done')
ui.gone('pay-celebration')
ui.element('pay-settled')
ui.capture('03-settled')
print('PASS: first settle celebrated with the badge and one sticker')
