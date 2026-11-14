"""小貘记得 (145, 283, 284). 我的 → 小貘 shows the 小貘记得 row with its count and pushes the grouped list: 地方 and 习惯, the
switch on top with the on footer. Swiping a row deletes it once; a row opens its editor, which shows its values and
deletes it; 添加一条 saves a new entry into its section. Turning the switch off says nothing new is kept or used and
hides 添加; 全部删除 asks first and leaves the empty state."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import assert_calls  # noqa: E402
from driver import UI, assert_appearance, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/app/(tabs)/me/', 'src/app/ask-memory-entry.tsx', 'src/app/_layout.tsx',
        'src/lib/i18n/locales/ask/', 'src/ui/NoticeCard.tsx', 'src/ui/SyncedTextField.tsx', 'verification/ui/ask.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'given',
        '-uiVerifyAiMemory', 'some', '-uiVerifyAiDelayMs', '1200']

ui = UI(*sys.argv[1:])


def rows(items):
    return [i.get('AXLabel') or '' for i in items if (i.get('AXUniqueId') or '').startswith('memory-row-')]


def footer_is(key, **params):
    expected = ui.t(key, **params)
    ui.wait_label('memory-footer', lambda label: label == expected, f'the footer is not {expected}')


reach_home(ui)
ui.tap('tab-me')
ui.tap('me-tapir')
count = ui.t('ask.memory.count', count=3)
ui.wait(lambda items: count in ((by_id(items, 'tapir-memory-row') or {}).get('AXLabel') or ''),
        f'the 小貘记得 row does not read {count}')
ui.tap('tapir-memory-row')
ui.element('memory-screen', timeout=30)
ui.wait(lambda items: len(rows(items)) == 3, 'the page does not list the three entries')
footer_is('ask.memory.onFooter', provider=ui.t('ask.provider'))
dorm = ui.t('ask.memory.row', label='宿舍', content='Sunway Geo')
assert dorm in rows(ui.read()), f'宿舍 is not listed as {dorm}: {rows(ui.read())}'
ui.labelled(ui.t('ask.memory.kind.place'))
ui.labelled(ui.t('ask.memory.kind.preference'))
ui.at_rest()
shot = ui.capture('01-list')
screen = by_id(ui.read(), 'memory-screen')['frame']
assert_appearance(shot, ui.appearance, screen['x'] + 4, screen['y'] + screen['height'] - 40, 'the page background')

school = ui.element('memory-row-mem-school')['frame']
y = school['y'] + school['height'] / 2
ui.swipe((school['x'] + school['width'] - 24, y), (school['x'] + 40, y), duration=0.4)
ui.labelled(ui.t('payee.delete'))
ui.capture('02-swiped')
ui.tap_label(ui.t('payee.delete'))
ui.gone('memory-row-mem-school')
assert_calls(ui, 'memoryRemove', 1)

ui.tap('memory-row-mem-dorm')
ui.element('memory-entry-sheet', timeout=30)
ui.wait(lambda items: ((by_id(items, 'memory-entry-content') or {}).get('AXValue') or '') == 'Sunway Geo',
        'the editor does not show the entry')
ui.at_rest()
ui.capture('03-editor')
ui.tap('memory-entry-delete')
ui.gone('memory-entry-sheet')
ui.gone('memory-row-mem-dorm')
assert_calls(ui, 'memoryRemove', 2)

ui.tap('memory-add')
ui.element('memory-entry-sheet', timeout=30)
ui.tap('memory-entry-label')
ui.type('Gym')
ui.tap('memory-entry-content')
ui.type('Pyramid')
ui.wait(lambda items: ((by_id(items, 'memory-entry-content') or {}).get('AXValue') or '') == 'Pyramid',
        'the content never read Pyramid')
ui.tap_label(ui.t('ask.memory.entry.save'))
ui.gone('memory-entry-sheet', timeout=30)
saved = ui.t('ask.memory.row', label='Gym', content='Pyramid')
ui.wait(lambda items: saved in rows(items), f'the new entry is not listed as {saved}')
assert assert_calls(ui, 'memorySave', 1)[0] == {'id': None, 'kind': 'place', 'label': 'Gym', 'content': 'Pyramid'}

ui.flip('memory-switch')
ui.element('memory-switching', timeout=10)
footer_is('ask.memory.offFooter')
ui.gone('memory-add')
assert len(rows(ui.read())) == 2, 'turning the switch off removed entries'
ui.at_rest()
ui.capture('04-off')

ui.tap('memory-clear')
ui.labelled(ui.t('ask.memory.clearTitle', count=2))
ui.capture('05-clear-confirm')
ui.tap('memory-clear-confirm')
ui.element('memory-empty', timeout=30)
assert_calls(ui, 'memoryClear', 1)
ui.at_rest()
ui.capture('06-empty')
print('PASS: 小貘记得 lists, deletes by swipe and in the editor, adds, switches off and clears after asking')
