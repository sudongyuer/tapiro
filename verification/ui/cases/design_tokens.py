"""The design-tokens scene renders every type role, the status set and a 44 pt accent button and the hold button (track at rest, gold while sending) in the current appearance."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, assert_colour, assert_touch_target, token  # noqa: E402

DEPS = []

ROLES = ['large-title', 'moment-title', 'reward', 'title', 'body', 'secondary', 'meta']
STATUSES = [
    'circle',
    'circle.fill',
    'exclamationmark.circle.fill',
    'checkmark.circle.fill',
    'clock.badge.exclamationmark',
]

SCENE = 'design-tokens'

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')

for role in ROLES:
    ui.element(f'tokens-type-{role}', timeout=5)
for symbol in STATUSES:
    ui.element(f'tokens-status-{symbol}', timeout=5)
for name in ['pay', 'ride', 'progress', 'calm']:
    ui.element(f'tokens-card-{name}', timeout=5)
for name in ['urgent', 'live', 'calm']:
    ui.element(f'tokens-stage-{name}', timeout=5)
for name in ['pickup', 'buy', 'queue', 'handle', 'move', 'accompany', 'study', 'other']:
    ui.element(f'tokens-sticker-{name}', timeout=5)

assert_touch_target(ui.element('tokens-primary-button'), 'primary button')
shot = ui.capture('design-tokens')
assert_appearance(shot, ui.appearance, 60, 300, 'navigation bar')
assert_appearance(shot, ui.appearance, 20, 2500, 'screen background')
hold = ui.element('tokens-hold-button')['frame']
track = {'x': hold['x'] + 12, 'y': hold['y'] + hold['height'] / 2 - 6, 'width': 12, 'height': 12}
assert_colour(ui.snap('design-tokens-hold'), track, token('--color-hold-track', ui.appearance), 'hold track')
print('PASS: type roles, status set, accent button and hold track rendered')
