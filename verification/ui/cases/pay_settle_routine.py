"""A later settle (seven stickers already) plays the same celebration without the badge: 又帮成一单, the five most recent stickers shift one slot forward while the book rises into one centred group with the headline, sticker 8 lands in the first slot, the count rolls 7 → 8 (video); 看看贴纸本 opens the sticker book with the new sticker first."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from celebration import assert_celebration  # noqa: E402
from driver import UI, by_id  # noqa: E402
from pay import open_sheet  # noqa: E402

DEPS = [
    'src/features/payment/',
    'src/features/stickers/',
    'src/app/pay/',
    'verification/ui/pay.py',
    'verification/ui/celebration.py',
]
SCENE = 'pay-sheet'
ARGS = ['-uiVerifyPayment', 'fixture-owed-cash', '-uiVerifyStickers', 'seven', '-uiVerifyFx', 'none']
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
open_sheet(ui)
ui.element('pay-payee-due-cash')
ui.tap('pay-confirm')
assert_celebration(ui, first=False, count=8, title='帮带一杯咖啡', name='小林', amount=r'RM\s?8\.00', shot_name='01-routine')
ui.tap('pay-celebration-book-open')
ui.element('sticker-book')
count = ui.wait_label(
    'sticker-book-count',
    lambda label: label.startswith(ui.tn('stickers.count', 8)),
    'the sticker book does not count 8 stickers',
)
first = ui.element('sticker-cell-0')
prefix = ui.t('stickers.label.a11y', line1=ui.t('stickers.label.payee', name='小林'), title='帮带一杯咖啡', date='')
assert (first.get('AXLabel') or '').startswith(prefix), first.get('AXLabel')
assert by_id(ui.read(), 'sticker-cell-1'), 'earlier stickers missing'
ui.capture('02-book')
print('PASS: a later settle celebrates without the badge and the book lists the new sticker first')
