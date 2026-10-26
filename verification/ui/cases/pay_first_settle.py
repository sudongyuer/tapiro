"""A cash payee (sheet titled 收款, 已收到 pinned at the bottom, no 还没收到) settles a due payment; the first 已收到 plays the full celebration (sticker peels off the receipt and flies into the first slot, headline and book in one centred group, 第一次收款 badge, count 1, video), and 好的 returns to the settled sheet."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from celebration import assert_celebration  # noqa: E402
from driver import UI, by_id  # noqa: E402
from pay import assert_pinned, assert_title, open_sheet  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py', 'verification/ui/celebration.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayment', 'fixture-owed-cash', '-uiVerifyStickers', 'none']
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
open_sheet(ui)
due = ui.element('pay-payee-due-cash')
assert ui.t('pay.payee.dueCash', name='小林') in (due.get('AXLabel') or ''), due.get('AXLabel')
assert_title(ui, 'pay.sheet.titlePayee')
assert_pinned(ui, 'pay-confirm', '已收到')
assert by_id(ui.read(), 'pay-not-received') is None, 'the cash state offers 还没收到'
ui.capture('01-cash-due')
ui.tap('pay-confirm')
assert_celebration(ui, first=True, count=1, title='帮带一杯咖啡', name='小林', amount=r'RM\s?8\.00', shot_name='02-celebration', cny=r'13\.07')
ui.tap('pay-celebration-done')
ui.gone('pay-celebration')
ui.element('pay-settled')
ui.capture('03-settled')
print('PASS: first settle celebrated with the badge and one sticker')
