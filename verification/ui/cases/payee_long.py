"""With seven worst-case methods (a long bank name, long payee names), scrolling 收款方式 to the bottom leaves the cash row fully above the bottom accessory and the tab bar."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, accessory, assert_appearance, by_id  # noqa: E402
from payee import open_payee, row_labels  # noqa: E402

DEPS = [
    'src/features/payee/',
    'src/app/payee/',
    'src/app/(tabs)/_layout.tsx',
    'src/app/(tabs)/me/',
    'src/features/account/',
    'src/features/shell/',
    'verification/ui/payee.py',
]

LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyFixture', 'worst', '-uiVerifySignedIn', 'onboarded']
BUDGET = 220

ui = UI(*sys.argv[1:])
open_payee(ui)
ui.element('payee-row-00000000-0000-4000-8000-000000000001')
ui.capture('01-top')
for _ in range(3):
    ui.swipe((200, 650), (200, 200), duration=0.3)



items = ui.settled(lambda items: by_id(items, 'payee-cash'), 'cash row never settled after scrolling')
items = ui.read()
cash = by_id(items, 'payee-cash')['frame']
bottom = cash['y'] + cash['height']
bar = accessory(items)
limit = bar['frame']['y'] if bar else min(i['frame']['y'] for i in items if (i.get('AXUniqueId') or '').startswith('tab-'))
assert bottom <= limit, f'cash row ends at {bottom}, under the accessory or tab bar at {limit}'
assert any('Bank Kerjasama' in row for row in row_labels(items)) or len(row_labels(items)) >= 3, row_labels(items)
shot = ui.capture('02-bottom')
assert_appearance(shot, ui.appearance, 20, 2500, 'screen background')
print(f'PASS: last row ends at {bottom} pt, above {limit} pt')
