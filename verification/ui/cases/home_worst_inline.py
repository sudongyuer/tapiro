"""With one worst-case pay item, scrolling home past it minimises the bar and the inline accessory truncates the long title on one line."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/home/', 'src/features/shell/', 'src/app/(tabs)/_layout.tsx', 'src/app/(tabs)/bounty/']

ARGS = ['-uiVerifyFixture', 'worst', '-uiVerifyShellFeed', 'oweMoney', '-uiVerifySignedIn', 'onboarded']
LOCALES = ['zh-Hans', 'ms']

ui = UI(*sys.argv[1:])
reach_home(ui)
ui.settled(lambda items: by_id(items, 'live-card-oweMoney'), 'home never settled')
for _ in range(4):
    ui.swipe((200, 650), (200, 250))
    inline = by_id(ui.read(), 'urgent-accessory-inline')
    if inline:
        break
assert inline, 'the inline accessory never appeared after scrolling past the pay card'
assert inline['AXLabel'].startswith(ui.t('pay.live.owe', name='Wan Nurul Aisyah')), f'inline accessory label {inline["AXLabel"]}'
assert '12,345.60' in inline['AXLabel'], f'inline accessory label lacks the amount: {inline["AXLabel"]}'
f = inline['frame']
assert f['x'] >= 0 and f['x'] + f['width'] <= 402, f'inline accessory overflows: {f}'
ui.snap('01-inline')
print('PASS: inline accessory with a worst-case title')
