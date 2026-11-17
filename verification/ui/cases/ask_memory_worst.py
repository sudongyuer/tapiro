"""Worst cases on 小貘记得. A list that fails to load says so with 重试 and is never shown as empty; a long label and a
long value wrap without truncating the row's other side away. A full list of 50 disables 添加一条 and says why. A
refused save in the editor keeps the sheet and the typed words."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import assert_calls  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, luma, reach_home  # noqa: E402
from ocr import lines_in  # noqa: E402

DEPS = ['src/features/ask/', 'src/app/(tabs)/me/', 'src/app/ask-memory-entry.tsx', 'src/lib/i18n/locales/ask/',
        'src/ui/NoticeCard.tsx', 'verification/ui/ask.py', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
LONG = ['-uiVerifyAiMemory', 'long', '-uiVerifyAiMemoryFail', 'load,load,save']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'given',
        '-uiVerifyAiDelayMs', '1200', '-uiVerifyAiMemory', 'long', '-uiVerifyAiMemoryFail', 'load,load,save']

ui = UI(*sys.argv[1:])


def open_page(count=None):
    ui.tap('tab-me')
    ui.tap('me-tapir')
    if count is None:
        ui.element('tapir-memory-row', timeout=30)
        assert_calls(ui, 'memoryList', 1)
        label = (by_id(ui.read(), 'tapir-memory-row') or {}).get('AXLabel') or ''
        assert label == ui.t('ask.memory.title'), f'a failed load shows a count: {label!r}'
    ui.tap('tapir-memory-row')
    ui.element('memory-screen', timeout=30)


reach_home(ui)
open_page()
ui.element('memory-failed', timeout=30)
assert by_id(ui.read(), 'memory-empty') is None, 'a failed load shows the empty state'
assert by_id(ui.read(), 'memory-switch') is None, 'a failed load shows a switch'
ui.at_rest()
ui.capture('01-failed')
ui.tap('memory-retry')
row = ui.element('memory-row-mem-long', timeout=30)['frame']
ui.at_rest()
shot = ui.snap('02-long')
value = [line for line in lines_in(shot, ui.locale)
         if line['x'] > row['x'] + row['width'] / 2 and row['y'] <= line['y'] <= row['y'] + row['height']]
assert len(value) == 2, f'the long value is not read as two lines: {value}'
ends = [line['x'] + line['width'] for line in value]
assert abs(ends[0] - ends[1]) < 16, f'the long value is not right-aligned in the trailing column: {value}'

ui.tap('memory-add')
ui.element('memory-entry-sheet', timeout=30)
ui.tap('memory-entry-label')
ui.type('Gym')
ui.tap('memory-entry-content')
ui.type('Pyramid')
ui.wait(lambda items: ((by_id(items, 'memory-entry-content') or {}).get('AXValue') or '') == 'Pyramid',
        'the content never read Pyramid')
ui.tap_label(ui.t('ask.memory.entry.save'))
ui.wait_label('memory-entry-error', lambda label: label == ui.t('ask.memory.error.failed'), 'the refusal is not shown')
assert ((by_id(ui.read(), 'memory-entry-content') or {}).get('AXValue') or '') == 'Pyramid', 'the words were lost'
assert_calls(ui, 'memorySave', 1)
ui.capture('03-save-failed')
ui.tap_label(ui.t('ask.memory.entry.close'))
ui.gone('memory-entry-sheet')

relaunch(ui, drop=LONG, add=['-uiVerifyAiMemory', 'full'])
open_page(count=50)
ui.element('memory-row-mem-1', timeout=30)
screen = by_id(ui.read(), 'memory-screen')['frame']
x = screen['x'] + screen['width'] / 2
for _ in range(12):
    if by_id(ui.read(), 'memory-full'):
        break
    ui.swipe((x, screen['y'] + screen['height'] * 0.75), (x, screen['y'] + screen['height'] * 0.2), 0.3)
ui.element('memory-full', timeout=10)
ui.at_rest()
add = by_id(ui.read(), 'memory-add')
assert add and add.get('enabled') is False, f'添加一条 is enabled on a full list: {add}'
shot = ui.snap('04-full')
f = add['frame']
shades = [luma(rgb) for rgb in shot.pixels({'x': f['x'] + 16, 'y': f['y'] + 10, 'width': 140, 'height': f['height'] - 20})]
ink = min(shades) if ui.appearance == 'light' else max(shades)
assert (ink > 110) if ui.appearance == 'light' else (ink < 150), f'the disabled 添加一条 is drawn in full ink (luma {ink:.0f})'
print('PASS: a failed load is not empty, long entries wrap, a refused save keeps the words, a full list says why')
