"""问小貘 opens as a sheet from 悬赏 and from 拼车 with suggestions for that tab, and closing it leaves the same tab selected."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, luma, reach_home, selected  # noqa: E402

DEPS = ['src/features/shell/', 'src/features/home/', 'src/app/(tabs)/', 'src/app/ask.tsx']

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
    scale = min(1.0, max(0.9, by_id(items, 'ask-tapir-sheet')['frame']['width'] / items[0]['frame']['width']))
    floor = 44 * scale - (0.5 if scale < 1 else 0)
    for identifier in ('ask-tapir-close', 'ask-tapir-mic'):
        f = by_id(items, identifier)['frame']
        assert min(f['width'], f['height']) >= floor, f'{identifier} is under 44 pt at sheet scale {scale:.3f}: {f}'
    assert by_id(items, 'ask-tapir-mic').get('enabled') is False, 'the mic is not marked disabled'
    for identifier in ('ask-tapir-suggestion-0', 'ask-tapir-suggestion-2', 'ask-tapir-prompt', 'ask-tapir-coming-soon'):
        f, edge = by_id(items, identifier)['frame'], sheet['frame']
        assert f['x'] >= edge['x'] and f['x'] + f['width'] <= edge['x'] + edge['width'], f'{identifier} overflows the sheet: {f}'
    shot = ui.snap(name)
    f = sheet['frame']
    background = luma(shot.rgb(f['x'] + 8, f['y'] + f['height'] - 8))
    if ui.appearance == 'dark':
        assert background < 80, f'sheet background is light ({background:.0f}) in dark appearance'
    else:
        assert background > 175, f'sheet background is dark ({background:.0f}) in light appearance'
    ui.tap('ask-tapir-close')
    ui.gone('ask-tapir-sheet')
    ui.wait(lambda items: selected(items) == [tab], f'{tab} is not selected after closing the sheet')


reach_home(ui)
open_sheet('tab-bounty', '01-sheet-from-bounty')
ui.element('home-scroll')

ui.tap('tab-ride')
ui.element('ride-empty')
open_sheet('tab-ride', '02-sheet-from-ride')
ui.element('ride-empty')
print('PASS: 问小貘 sheet from 悬赏 and 拼车 with tab-specific suggestions; tab kept')
