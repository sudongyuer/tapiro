"""Worst-case pay sheet (break-ui): RM 12,345.60 to Wan Nurul Aisyah binti Wan Abdul Rahman for a 50-character title,
with every method (Alipay, WeChat, TNG, DuitNow phone, bank, cash) carrying the 50-character bank name. The header
draws the whole name and amount, every method row stays inside the sheet, the bank account row and the reference copy
with 44 pt buttons, the name check draws the whole bank name, and 我已付款 stays pinned at the bottom. ms runs the
longest copy; light and dark at milestones."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
import ocr  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from pay import assert_pinned, find, open_sheet, scroll_to  # noqa: E402
from whole import assert_drawn_whole, plain_text  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'verification/ui/pay.py', 'verification/ui/whole.py']
SCENE = 'pay-sheet'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyFixture', 'worst']
PAYEE = 'Wan Nurul Aisyah binti Wan Abdul Rahman'
BANK_NAME = 'WAN NURUL AISYAH BINTI WAN ABDUL RAHMAN AL-HADDAD'
AMOUNT = r'RM\s?12,345\.60'

ui = UI(*sys.argv[1:])


# lines_in adds a second zh-Hans-first read for Latin locales, which garbles the Latin name into a near-duplicate line
# inside the same frame; the header and the name check are Latin names in every locale.
def read_latin(shot):
    return ocr.lines_in(shot, 'zh-Hans') if ui.locale == 'zh-Hans' else ocr.lines(shot, ['en-US', 'zh-Hans'])


# The check is a sentence ending in a full stop, which ocr.clipped reads as an ellipsis; only a real ellipsis counts.
def assert_name_drawn(shot, frame):
    lines = [line for line in read_latin(shot) if ocr.inside(line, frame, slack=6)]
    drawn = plain_text(''.join(line['text'] for line in sorted(lines, key=lambda l: (l['y'], l['x']))))
    print(f'name check: drawn {drawn!r}')
    assert not any(line['text'].rstrip().endswith(('…', '...')) for line in lines), f'name check is truncated: {drawn!r}'
    assert plain_text(BANK_NAME) in drawn, f'name check does not draw the whole {BANK_NAME!r}: {drawn!r}'


def assert_in_sheet(element, name):
    sheet = by_id(ui.read(), 'pay-sheet')['frame']
    f = element['frame']
    assert f['x'] >= sheet['x'] - 1 and f['x'] + f['width'] <= sheet['x'] + sheet['width'] + 1, \
        f'{name} runs off the sheet: {f}, sheet {sheet}'


amount = open_sheet(ui)
label = amount.get('AXLabel') or ''
assert re.search(AMOUNT, label), f'amount label {label!r}'
assert ui.t('pay.sheet.payTo', name=PAYEE) in label, f'the header does not name {PAYEE}: {label!r}'
assert_in_sheet(amount, 'header')
shot = ui.snap('01-header')
read = assert_drawn_whole(ui, shot, amount['frame'], ui.t('pay.sheet.payTo', name=PAYEE), 'header name',
                         read=read_latin(shot))
assert_drawn_whole(ui, shot, amount['frame'], 'RM 12,345.60', 'header amount', read=read)

items = ui.read()
kinds = [(i.get('AXUniqueId') or '').split('-')[2] for i in find(items, 'pay-method-')]
assert kinds == ['alipay', 'wechat', 'duitnow_qr', 'duitnow_id', 'bank_account'], f'methods {kinds}'
for row in find(items, 'pay-method-'):
    assert_in_sheet(row, row['AXUniqueId'])
    assert_touch_target(row, row['AXUniqueId'])
bank = next(i for i in items if (i.get('AXUniqueId') or '').startswith('pay-method-bank_account'))
ui.capture('02-methods')

ui.tap(bank['AXUniqueId'])
number = scroll_to(ui, 'pay-number-copy')
assert_touch_target(number, 'account copy')
assert_in_sheet(number, 'account copy')
value = by_id(ui.read(), 'pay-number-value')
assert value and '1234564821' in re.sub(r'\D', '', value.get('AXLabel') or ''), value
assert_in_sheet(value, 'account number')
reference = scroll_to(ui, 'pay-reference-copy')
assert_touch_target(reference, 'reference copy')
assert_in_sheet(reference, 'reference copy')
ui.capture('03-bank')

check = scroll_to(ui, 'pay-name-check')
expected = ui.t('pay.sheet.nameCheck', name=BANK_NAME)
assert expected in (check.get('AXLabel') or ''), check.get('AXLabel')
assert_in_sheet(check, 'name check')
ui.at_rest()
shot = ui.snap('04-name-check')
assert_name_drawn(shot, check['frame'])
assert_pinned(ui, 'pay-mark-paid', '我已付款')
print('PASS: RM 12,345.60, the longest names and every method fit the pay sheet')
