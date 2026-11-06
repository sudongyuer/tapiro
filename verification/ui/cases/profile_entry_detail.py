"""Entry from the bounty detail (247 A): the poster row 小林 · 靠谱 carries a chevron and the hint 看小林的主页; a tap pushes
小林's profile in the 悬赏 tab (one profile read for fixture-poster-lin), and the back button returns to the detail with the
row deselected."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import visible  # noqa: E402
from driver import UI, assert_touch_target, by_id, close, reach_home  # noqa: E402
from profile import open_profile, rep_calls  # noqa: E402

DEPS = ['src/features/bounty/detail/', 'src/app/(tabs)/bounty/', 'src/features/reputation/profile/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']
CELL = {'light': (255, 255, 255), 'dark': (28, 28, 30)}

ui = UI(*sys.argv[1:])
reach_home(ui)
card = visible(ui, 'bounty-card-fixture-bounty-01')
ui.at_rest()
f = card['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
poster = ui.element('bounty-detail-poster', timeout=30)
assert poster.get('type') == 'Button', poster.get('type')
assert '小林' in (poster.get('AXLabel') or ''), poster.get('AXLabel')
assert_touch_target(poster, '发布者那行')
ui.at_rest()
ui.capture('01-detail')
ui.tap('bounty-detail-poster')
open_profile(ui)
assert [call['personId'] for call in rep_calls(ui, 'profile', 1)] == ['fixture-poster-lin']
ui.at_rest()
ui.capture('02-profile')
ui.tap('BackButton')
ui.gone('profile-screen')
ui.element('bounty-detail-poster')
ui.at_rest()
shot = ui.snap('03-back')
row = by_id(ui.read(), 'bounty-detail-poster')['frame']
fill = shot.rgb(row['x'] + row['width'] * 0.7, row['y'] + row['height'] / 2)
assert close(fill, CELL[ui.appearance], 8), f'the poster row stays highlighted: {fill}'
print('PASS: the poster row pushes the profile and returns deselected')
