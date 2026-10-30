"""Each sticker in 一起办成的事 is labelled who helped whom, then the title (71A, 72A): 帮{name} for a payee, {name}帮我 for a payer, 和{name} for a ride, 帮一位同学 / 一位同学帮我 when the counterpart is gone. With 40-code-point names and 120-code-point titles, line 1 stays on one line and the title stops at two, so every row is the same height; VoiceOver still reads the full name and title."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/stickers/', 'src/app/(tabs)/me/']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyStickers', 'worst']

WORST_NAME = 'Nurul Aisyah binti Wan Abdul Rahman Shah'
WORST_TITLE = '帮忙从 Mid Valley Megamall 的 Uniqlo 取一件外套，顺便在 Sunway Pyramid 的 ZUS Coffee 买两杯 Spanish Latte，再送到 Universiti Malaya Kolej 宿舍楼'

ui = UI(*sys.argv[1:])
EXPECTED = [
    (ui.t('stickers.label.payee', name=WORST_NAME), WORST_TITLE),
    (ui.t('stickers.label.payer', name=WORST_NAME), WORST_TITLE),
    (ui.t('stickers.label.ride', name=WORST_NAME), 'Pangsapuri Vista Harmoni Blok C → KLIA2 Terminal Ketibaan Antarabangsa'),
    (ui.t('stickers.label.payeeUnnamed'), 'Wan Nurul Aisyah binti Wan Abdul Rahman 的毕业论文打印和装订'),
    (ui.t('stickers.label.payerUnnamed'), '帮忙把行李从 Universiti Malaya Kolej Kediaman Kinabalu 搬到 Bandar Sunway'),
    (ui.t('stickers.label.payee', name='J'), '陪诊'),
]

reach_home(ui)
ui.tap('tab-me')
ui.tap('me-stickers')
ui.element('sticker-cell-0')
items = ui.read()
cells = [by_id(items, f'sticker-cell-{index}') for index in range(len(EXPECTED))]
ui.capture('01-labels')
if not all(cells):
    sheet = by_id(items, 'sticker-book')['frame']
    x = sheet['x'] + sheet['width'] / 2
    ui.swipe((x, sheet['y'] + sheet['height'] * 0.6), (x, sheet['y'] + sheet['height'] * 0.3), 0.4)
    later = ui.read()
    cells = [cell or by_id(later, f'sticker-cell-{index}') for index, cell in enumerate(cells)]
    ui.capture('02-labels-scrolled')
assert all(cells), f'missing cells: {[i for i, cell in enumerate(cells) if not cell]}'

for index, ((line1, title), cell) in enumerate(zip(EXPECTED, cells)):
    label = cell.get('AXLabel') or ''
    prefix = ui.t('stickers.label.a11y', line1=line1, title=title, date='')
    assert label.startswith(prefix), f'cell {index} reads {label!r}, expected it to start with {prefix!r}'
    assert len(label) > len(prefix), f'cell {index} does not read its date: {label!r}'

named, unnamed = cells[0]['frame']['height'], cells[3]['frame']['height']
print(f'row heights: worst names {named:.1f}, no names {unnamed:.1f}')
assert abs(named - unnamed) <= 1, f'the row with 40-code-point names is {named - unnamed:.1f} pt taller: line 1 wraps or the title exceeds two lines'
print('PASS: sticker labels say who helped whom and stay within one line plus two')
