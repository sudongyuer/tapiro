"""The whole pinned bottom bar is opaque (owner, 2026-11-06). 这次没选上 sits in the bar with no fill of its own: with a long
description scrolled under the bar, the bar beside that line and below 看看附近别的悬赏, down to the home indicator with
the tab bar minimised, is the canvas colour, in the run's appearance."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen, visible  # noqa: E402
from bounty import assert_bar_hides_content  # noqa: E402
from driver import UI, assert_colour, bottom, by_id, reach_home  # noqa: E402
from gestures import drag  # noqa: E402

DEPS = ['src/ui/SheetFrame.tsx', 'src/ui/PillButton.tsx', 'modules/tapiro-kit/ios/PinnedBarView.swift',
        'src/features/bounty/detail/', 'verification/ui/bounty.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBoard', 'worst',
        '-uiVerifyDetail', 'notSelected', '-uiVerifyDetailId', 'fixture-worst-01']
BUDGET = 180
WORST = 'bounty-card-fixture-worst-01'
# A pushed screen's canvas: in dark, not the (28, 28, 30) of the cards scrolling under the bar.
CANVAS = {'light': (242, 242, 247), 'dark': (0, 0, 0)}

ui = UI(*sys.argv[1:])
reach_home(ui)
card = visible(ui, WORST)
ui.at_rest()
f = card['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
ui.element('bounty-detail-not-selected')
ui.at_rest()
width = screen(ui.read())['width']
drag(ui, (width / 2, 480), (width / 2, 220))
ui.at_rest()
items = ui.read()
shot = ui.snap('01-under-bar')
behind = by_id(items, 'bounty-detail-description')
assert behind, 'the description is missing'
row = by_id(items, 'bounty-detail-not-selected')['frame']
browse = by_id(items, 'bounty-detail-browse')
s = screen(items)
band = {'y': row['y'] + row['height'] * 0.25, 'height': row['height'] * 0.5}
left = {**band, 'x': 26, 'width': 40}
right = {**band, 'x': s['width'] - 66, 'width': 40}
under = {'x': s['width'] * 0.32, 'width': s['width'] * 0.36, 'y': bottom(browse) + 2,
         'height': s['height'] - bottom(browse) - 2 - 24}
for strip, name in ((left, 'left of 这次没选上'), (right, 'right of 这次没选上'), (under, 'below the button')):
    assert_bar_hides_content(shot, strip, behind['frame'], name)
    assert_colour(shot, strip, CANVAS[ui.appearance], name)
print('PASS: the bar hides scrolled content beside its text and down to the home indicator')
