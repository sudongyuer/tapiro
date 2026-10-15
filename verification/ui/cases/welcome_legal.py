"""The welcome terms line opens 用户协议 and 隐私政策 as draft sheets; the close button and a swipe down each return to the same sign-in panel."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, bottom, by_id  # noqa: E402

LOCALES = ['zh-Hans', 'ms']
TITLES = {
    'zh-Hans': {'terms': '用户协议', 'privacy': '隐私政策'},
    'ms': {'terms': 'Terma Penggunaan', 'privacy': 'Dasar Privasi'},
}
LINKS = {
    'zh-Hans': {'terms': '《用户协议》', 'privacy': '《隐私政策》'},
    'ms': {'terms': 'Terma Penggunaan', 'privacy': 'Dasar Privasi'},
}
DRAFT = {'zh-Hans': '草稿', 'ms': 'Draf'}
CLOSE = {'zh-Hans': '关闭', 'ms': 'Tutup'}

ui = UI(*sys.argv[1:])


def risen(items):
    button = by_id(items, 'sign-in-apple')
    return button if button and bottom(button) <= items[0]['frame']['height'] else None


ui.settled(risen, 'the sign-in panel never settled')
items = ui.read()
panel = by_id(items, 'welcome-headline')['frame']
google_bottom = bottom(by_id(items, 'sign-in-google'))

for index, page in enumerate(('terms', 'privacy')):
    link = ui.settled(lambda items: by_id(items, f'welcome-{page}-link'), f'{page} link missing')
    f = link['frame']
    assert link.get('AXLabel') == LINKS[ui.locale][page], f'{page} link reads {link.get("AXLabel")}'
    assert link.get('type') == 'Link', f'{page} is exposed as {link.get("type")}, not a link'
    slop = (44 - f['height']) / 2
    assert f['y'] - slop >= google_bottom, f'{page} link target reaches into the Google button: {f}'
    # The link text is 18 pt tall; hitSlop extends it to 44 pt, so tap 10 pt above the text.
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] - 10)
    ui.wait_label('legal-draft', lambda text: text.startswith(DRAFT[ui.locale]), f'{page} draft marker missing')
    ui.labelled(TITLES[ui.locale][page])
    ui.capture(f'{index + 1}-{page}')
    if page == 'terms':
        ui.tap_label(CLOSE[ui.locale])
    else:
        screen = ui.read()[0]['frame']
        ui.swipe((screen['width'] / 2, 140), (screen['width'] / 2, screen['height'] - 40), duration=0.4)
    ui.gone('legal-draft')
    back = ui.settled(lambda items: by_id(items, 'welcome-headline'), 'panel missing after closing')
    assert back['frame'] == panel, f'panel moved after closing {page}: {back["frame"]} vs {panel}'

print('PASS: both legal sheets open from the terms line, show the draft marker and close back to the panel')
