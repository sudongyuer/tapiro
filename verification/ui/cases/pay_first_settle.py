"""The payee's first 已收到 opens the full-screen 第一次收到钱！ celebration (video), and 好的 returns to the settled sheet; a payee who takes cash settles a due payment the same way."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from pay import open_sheet  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py']
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayment', 'fixture-owed-cash']

ui = UI(*sys.argv[1:])
open_sheet(ui)
due = ui.element('pay-payee-due-cash')
assert ui.t('pay.payee.dueCash', name='小林') in (due.get('AXLabel') or ''), due.get('AXLabel')
ui.capture('01-cash-due')
ui.tap('pay-confirm')
ui.element('pay-celebration')
ui.labelled(ui.t('pay.celebrate.title'))
ui.capture('02-celebration')
ui.tap('pay-celebration-done')
ui.gone('pay-celebration')
ui.element('pay-settled')
ui.capture('03-settled')
print('PASS: first settle celebrated full screen')
