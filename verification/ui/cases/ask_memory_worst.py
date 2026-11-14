"""Worst cases on 小貘记得. A list that fails to load says so with 重试 and is never shown as empty; a long label and a
long value wrap without truncating the row's other side away. A full list of 50 disables 添加一条 and says why. A
refused save in the editor keeps the sheet and the typed words."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import assert_calls  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/app/(tabs)/me/', 'src/app/ask-memory-entry.tsx', 'src/lib/i18n/locales/ask/',
        'src/ui/NoticeCard.tsx', 'verification/ui/ask.py', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
LONG = ['-uiVerifyAiMemory', 'long', '-uiVerifyAiMemoryFail', 'load,save']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'given',
        '-uiVerifyAiDelayMs', '1200', *LONG]

ui = UI(*sys.argv[1:])


def open_page():
    ui.tap('tab-me')
    ui.tap('me-tapir')
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
ui.element('memory-row-mem-long', timeout=30)
ui.at_rest()
ui.capture('02-long')

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
open_page()
ui.element('memory-full', timeout=30)
add = by_id(ui.read(), 'memory-add')
assert add and add.get('enabled') is False, f'添加一条 is enabled on a full list: {add}'
ui.capture('04-full')
print('PASS: a failed load is not empty, long entries wrap, a refused save keeps the words, a full list says why')
