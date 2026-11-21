"""Each done card in 一起办成的事 says who helped whom, then the title (71A, 72A): 帮{name} for a payee, {name}帮我 for a
payer, 和{name} for a ride, 帮一位貘友 / 一位貘友帮我 when the counterpart is gone. With 40-code-point names and
120-code-point titles every card keeps the same height (the caption keeps its handwritten size and wraps to a second line, the title stops at two), and
VoiceOver reads the date, the full name and the full title."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, Shot, luma, reach_home  # noqa: E402

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
heights = []
for index, (line1, title) in enumerate(EXPECTED):
    card = ui.wait_label(
        f'sticker-card-{index}',
        lambda label, line1=line1, title=title: line1 in label and title in label,
        f'card {index} does not read {line1!r} and its title',
    )
    label = card.get('AXLabel') or ''
    assert label.index(line1) > 0, f'card {index} does not read its date first: {label!r}'
    heights.append(card['frame']['height'])
    if index in (0, 3):
        shot = Shot(ui.capture(f'0{index + 1}-card-{index}'), ui.read()[0]['frame']['width'])
    if index == 0:
        f = card['frame']
        second_line = {'x': f['x'] + 20, 'y': f['y'] + 266, 'width': f['width'] - 40, 'height': 24}
        ink = shot.count(second_line, lambda rgb: luma(rgb) < 70)
        assert ink > 80, f'the long caption did not wrap at full size: {ink} ink pixels where its second line belongs'
    f = card['frame']
    y = f['y'] + f['height'] / 2
    ui.swipe((f['x'] + f['width'] * 0.85, y), (f['x'] + f['width'] * 0.1, y), 1.2)

print(f'card heights: {heights}')
assert max(heights) - min(heights) <= 1, f'cards differ in height: {heights}'
print('PASS: done cards say who helped whom, read the date first and keep one height')
