"""问小貘 opens as a sheet from 悬赏 and from 拼车 with suggestions for that tab, and closing it leaves the same tab selected."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, luma, reach_home  # noqa: E402

LOCALES = ['zh-Hans', 'ms']
TABS = ['tab-bounty', 'tab-ride', 'tab-messages', 'tab-me']
COPY = {
    'zh-Hans': {
        'tab-bounty': ('在悬赏页 · 帮你写悬赏、找能接的', '帮我取快递'),
        'tab-ride': ('在拼车页 · 帮你凑人、算钱', '下午五点回 YC 谁一起'),
    },
    'ms': {
        'tab-bounty': ('Di Ganjaran · tulis ganjaran atau cari yang boleh diambil', 'Ambil bungkusan saya'),
        'tab-ride': ('Di Tumpangan · cari penumpang dan bahagikan tambang', 'Siapa nak balik ke YC pukul 5 petang?'),
    },
}

ui = UI(*sys.argv[1:])


def selected(items):
    return [t for t in TABS if str((by_id(items, t) or {}).get('AXValue')) == '1']


def open_sheet(tab, name):
    ui.tap('tab-ask-tapir')
    sheet = ui.settled(lambda items: by_id(items, 'ask-tapir-sheet'), 'ask sheet never settled')
    subtitle, suggestion = COPY[ui.locale][tab]
    ui.wait_label('ask-tapir-subtitle', lambda label: label == subtitle, f'subtitle is not {subtitle}')
    ui.wait_label('ask-tapir-suggestion-0', lambda label: label == suggestion, f'first suggestion is not {suggestion}')
    items = ui.state()
    scale = by_id(items, 'ask-tapir-sheet')['frame']['width'] / items[0]['frame']['width']
    for identifier in ('ask-tapir-close', 'ask-tapir-mic'):
        f = by_id(items, identifier)['frame']
        assert min(f['width'], f['height']) >= 44 * scale - 0.5, f'{identifier} is under 44 pt at sheet scale {scale:.3f}: {f}'
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


ui.element('sign-in-apple')
reach_home(ui)
open_sheet('tab-bounty', '01-sheet-from-bounty')
ui.element('home-scroll')

ui.tap('tab-ride')
ui.element('ride-empty')
open_sheet('tab-ride', '02-sheet-from-ride')
ui.element('ride-empty')
print('PASS: 问小貘 sheet from 悬赏 and 拼车 with tab-specific suggestions; tab kept')
