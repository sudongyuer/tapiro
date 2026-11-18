"""问小貘 opens as a sheet from 悬赏 and from 拼车 with suggestions for that tab; it closes with the system close button at the
trailing end of its bar (no drawn close button), and closing it leaves the same tab selected."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import close_button  # noqa: E402
from driver import UI, by_id, luma, reach_home, selected  # noqa: E402

DEPS = ['src/features/shell/', 'src/features/home/', 'src/app/(tabs)/', 'src/app/ask.tsx', 'src/app/_layout.tsx',
        'verification/ui/ask.py']

LOCALES = ['zh-Hans', 'ms']
COPY = {
    'tab-bounty': ('shell.ask.subtitle.bounty', 'shell.ask.suggestions.bounty.first'),
    'tab-ride': ('shell.ask.subtitle.ride', 'shell.ask.suggestions.ride.first'),
}

ARGS = ['-uiVerifySignedIn', 'onboarded']
ui = UI(*sys.argv[1:])


def open_sheet(tab, name):
    ui.tap('tab-ask-tapir')
    sheet = ui.settled(lambda items: by_id(items, 'ask-tapir-sheet'), 'ask sheet never settled')
    subtitle, suggestion = (ui.t(key) for key in COPY[tab])
    ui.wait_label('ask-tapir-subtitle', lambda label: label == subtitle, f'subtitle is not {subtitle}')
    ui.wait_label('ask-tapir-suggestion-0', lambda label: label == suggestion, f'first suggestion is not {suggestion}')
    items = ui.read()
    # role="search" is a UISearchTab on iOS 26.1+; selecting it must not activate a search field instead of the sheet.
    searching = [i.get('AXUniqueId') or i.get('AXLabel') for i in items if i.get('type') == 'SearchField']
    assert not searching, f'tapping 小貘 activated a search field: {searching}'
    scale =min(1.0, max(0.9, by_id(items, 'ask-tapir-sheet')['frame']['width'] / items[0]['frame']['width']))
    floor = 44 * scale - (0.5 if scale < 1 else 0)
    assert by_id(items, 'ask-tapir-close') is None, 'the sheet still draws its own close button'
    button = close_button(ui, items)
    assert button, 'the sheet has no system close button'
    edge = by_id(items, 'ask-tapir-sheet')['frame']
    assert button['frame']['x'] > edge['x'] + edge['width'] * 2 / 3, f'the close button is not at the trailing end: {button}'
    title = by_id(items, 'ask-tapir-subtitle')['frame']
    assert title['x'] + title['width'] <= button['frame']['x'], f'the header runs under the close button: {title}'
    # The system bar button draws a 36 pt glass circle and owns its own hit area; only the mic is ours to size.
    f = by_id(items, 'ask-tapir-mic')['frame']
    assert min(f['width'], f['height']) >= floor, f'ask-tapir-mic is under 44 pt at sheet scale {scale:.3f}: {f}'
    assert by_id(items, 'ask-tapir-mic').get('enabled') is not False, 'the mic is disabled'
    for identifier in ('ask-tapir-suggestion-0', 'ask-tapir-suggestion-2', 'ask-tapir-prompt', 'ask-tapir-mic'):
        f, edge = by_id(items, identifier)['frame'], sheet['frame']
        assert f['x'] >= edge['x'] and f['x'] + f['width'] <= edge['x'] + edge['width'], f'{identifier} overflows the sheet: {f}'
    shot = ui.snap(name)
    f = sheet['frame']
    # The half-detent sheet is glass, so its edge shows the page behind: in ms dark a ride card read 96 there along
    # the whole edge (2026-11-16). The prompt field is opaque; five points of it around its buttons measure the sheet.
    p, plus, mic = (by_id(items, i)['frame'] for i in ('ask-tapir-prompt', 'ask-tapir-add-image', 'ask-tapir-mic'))
    points = [(plus['x'] + plus['width'] / 2, plus['y'] - 8), (mic['x'] + mic['width'] / 2, mic['y'] - 8),
              ((plus['x'] + plus['width'] + p['x']) / 2, p['y'] + p['height'] / 2),
              ((p['x'] + p['width'] + mic['x']) / 2, p['y'] + p['height'] / 2),
              (plus['x'] + plus['width'] / 2, plus['y'] + plus['height'] + 8)]
    background = sorted(luma(shot.rgb(x, y)) for x, y in points)[2]
    if ui.appearance == 'dark':
        assert background < 80, f'sheet background is light ({background:.0f}) in dark appearance'
    else:
        assert background > 175, f'sheet background is dark ({background:.0f}) in light appearance'
    ui.tap_label(ui.t('shell.ask.close'))
    ui.gone('ask-tapir-sheet')
    ui.wait(lambda items: selected(items) == [tab], f'{tab} is not selected after closing the sheet')


reach_home(ui)
open_sheet('tab-bounty', '01-sheet-from-bounty')
ui.element('home-scroll')

ui.tap('tab-ride')
ui.element('ride-screen')
open_sheet('tab-ride', '02-sheet-from-ride')
ui.element('ride-screen')
print('PASS: 问小貘 sheet from 悬赏 and 拼车 with tab-specific suggestions; tab kept')
