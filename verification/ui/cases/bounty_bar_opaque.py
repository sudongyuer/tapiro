"""The whole pinned bottom bar is opaque (owner, 2026-11-06). 这次没选上 sits in the bar with no fill of its own: with a long
description scrolled under the bar, the bar beside that line and below 看看附近别的悬赏 down to the screen edge is one
colour, in the run's appearance."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen, visible  # noqa: E402
from bounty import assert_bar_hides_content, assert_grouped_background  # noqa: E402
from driver import UI, bottom, by_id, reach_home  # noqa: E402

DEPS = ['src/ui/SheetFrame.tsx', 'src/ui/PillButton.tsx', 'modules/tapiro-kit/ios/PinnedBarView.swift',
        'src/features/bounty/detail/', 'verification/ui/bounty.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBoard', 'worst',
        '-uiVerifyDetail', 'notSelected']
BUDGET = 180
WORST = 'bounty-card-fixture-worst-01'

ui = UI(*sys.argv[1:])
reach_home(ui)
card = visible(ui, WORST)
ui.at_rest()
f = card['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
ui.element('bounty-detail-not-selected')
ui.at_rest()
items = ui.read()
shot = ui.snap('01-under-bar')
behind = by_id(items, 'bounty-detail-description')
assert behind, 'the description is missing'
row = by_id(items, 'bounty-detail-not-selected')['frame']
browse = by_id(items, 'bounty-detail-browse')['frame']
s = screen(items)
band = {'y': row['y'] + row['height'] * 0.25, 'height': row['height'] * 0.5}
assert_bar_hides_content(shot, {**band, 'x': 26, 'width': 56}, behind['frame'], 'left of 这次没选上')
assert_bar_hides_content(shot, {**band, 'x': s['width'] - 82, 'width': 56}, behind['frame'], 'right of 这次没选上')
under = {'x': s['width'] * 0.32, 'width': s['width'] * 0.36, 'y': bottom(browse) + 2,
         'height': s['height'] - bottom(browse) - 2 - 24}
assert_bar_hides_content(shot, under, behind['frame'], 'below the button')
assert_grouped_background(ui, shot, {**band, 'x': 26, 'width': 56}, 'the bar')
print('PASS: the bar hides scrolled content beside its text and down to the screen edge')
