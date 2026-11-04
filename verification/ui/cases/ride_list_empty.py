"""With no rides at all, 拼车 is the moment screen (185 A): speckled ground, the big car sticker, 「现在还没人拼车」, one
line and a black 「发起拼车」; the nav-bar ＋ is hidden, and 发起拼车 opens 「去哪儿？」."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, close, token  # noqa: E402
from ride import add_button, open_list  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'src/app/ride-create/', 'verification/ui/ride.py',
        'src/ui/MomentBackground.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRides', 'empty']

ui = UI(*sys.argv[1:])
open_list(ui, ready='ride-empty')
title = ui.wait_label('ride-empty-title', lambda label: label == ui.t('ride.empty.title'),
                      'the moment title is not 现在还没人拼车')
ui.labelled(ui.t('ride.empty.body'))
action = ui.element('ride-empty-add')
assert action.get('AXLabel') == ui.t('ride.empty.action'), action.get('AXLabel')
assert_touch_target(action, '发起拼车')
assert add_button(ui) is None, 'the nav-bar ＋ is shown on the empty moment screen'
items = ui.read()
assert by_id(items, 'ride-list-failed') is None, 'the empty list is shown as a failure'
bar = by_id(items, ui.t('shell.tabs.ride'))
assert bar, 'the 拼车 navigation bar is missing'
visible_top = bar['frame']['y'] + bar['frame']['height']
visible_bottom = ui.element('tab-ride')['frame']['y']
# The sticker is not in the accessibility tree; it sits STICKER_BLOCK above the title (148 pt, --space-5 and --space-3).
STICKER_BLOCK = 148 + 20 + 12
top = title['frame']['y'] - STICKER_BLOCK
bottom = action['frame']['y'] + action['frame']['height']
offset = (top + bottom) / 2 - (visible_top + visible_bottom) / 2
assert abs(offset) <= 16, f'the moment is {offset:.0f} pt off the centre between the title bar and the tab bar'
shot = ui.snap('01-empty')
f = title['frame']
ground = shot.rgb(8, f['y'] + f['height'] / 2)
expected = token('--color-moment-bg', ui.appearance)
assert close(ground, expected, 14), f'moment ground is {ground}, expected {expected}'

ui.tap('ride-empty-add')
ui.element('ride-pick')
ui.capture('02-pick')
print('PASS: moment screen, no ＋, 发起拼车 opens 去哪儿？')
