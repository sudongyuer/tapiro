"""Opening 机场 in the ride form's details section eases the airport rows in over several frames (P22); under Reduce
Motion the rows appear in one step. The band under the tapped row is sampled frame by frame for the red 移除 that only
the open rows draw: the animated run must
show frames between the closed picture (a still taken before the tap; the recorder starts late) and the open one, the
reduced run must not."""
import sys
import tempfile
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, Shot, by_id  # noqa: E402
from recording import clip, frames  # noqa: E402
from ride import form_scroll_to, open_form, open_list, relaunch_list  # noqa: E402

DEPS = ['src/features/ride/create/', 'src/ui/theme/motion.ts', 'verification/ui/ride.py']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyPlaces', 'ride']
BAND_PT = 160
BETWEEN = 0.15

ui = UI(*sys.argv[1:])


def ink(shot, band):
    return shot.count(band, lambda rgb: rgb[0] > 170 and rgb[1] < 110 and rgb[2] < 110)


def open_airport(name):
    open_form(ui)
    add = form_scroll_to(ui, 'ride-form-airport-add')
    ui.at_rest()
    items = ui.read()
    width = items[0]['frame']['width']
    row = add['frame']
    band = {'x': row['x'], 'y': row['y'], 'width': row['width'], 'height': BAND_PT}
    start = ink(ui.snap(f'{name}-closed'), band)
    with clip(ui, name) as video:
        time.sleep(1.0)
        ui.tap('ride-form-airport-add')
        ui.element('ride-form-airport-remove', timeout=20)
        time.sleep(1.5)
    with tempfile.TemporaryDirectory() as tmp:
        counts = [(ink(Shot(path, width), band), at) for path, at in frames(video, tmp, 0.03)]
    end = counts[-1][0]
    low, high = sorted((start, end))
    margin = (high - low) * BETWEEN
    between = [at for value, at in counts if low + margin < value < high - margin]
    print(f'{name}: ink {start} -> {end}, {len(between)} frames between')
    assert high - low > 100, f'{name}: opening 机场 changed the band too little to measure ({start} -> {end})'
    return between


open_list(ui)
animated = open_airport('airport-open')
assert animated, 'the airport rows appeared in one step, not eased in'
ui.capture('01-airport-open')

relaunch_list(ui, add=['-uiVerifyReduceMotion', '1'])
reduced = open_airport('airport-open-reduced')
assert len(reduced) <= 1, f'with Reduce Motion the rows eased in over {len(reduced)} frames'
assert by_id(ui.read(), 'ride-form-airport-remove'), 'the airport rows are missing under Reduce Motion'
print(f'PASS: 机场 eased in over {len(animated)} frames; under Reduce Motion it appeared in one step')
