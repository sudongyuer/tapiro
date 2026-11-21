"""Entry from 我的: the name row is a 44 pt button with a chevron and, with no photo, the cream initial disc the profile
shows, with the tier and, on the line below, the level under the name (CoinPick1 251 A; OCR reads the level whole); a tap pushes your own profile in the 我的
tab (one read for your id, made by the tab) with the level card, and back returns with the row deselected. When that
read fails, the row shows the name alone, never a tier it does not have."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, assert_touch_target, by_id, close, reach_home, token  # noqa: E402
from ocr import lines_in  # noqa: E402
from profile import open_profile, rep_calls  # noqa: E402
from review import one_line  # noqa: E402

DEPS = ['src/features/account/MeView.tsx', 'src/ui/Avatar.tsx', 'src/app/(tabs)/me/', 'src/features/reputation/profile/', 'src/debug/ReputationScenes.tsx', 'src/ui/TierMark.tsx', 'src/features/reputation/hooks.ts', 'verification/ui/profile.py', 'verification/ui/bounty.py', 'verification/ui/ocr.py', 'verification/ui/review.py']
CELL = {'light': (255, 255, 255), 'dark': (28, 28, 30)}
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyStickers', 'many']

ui = UI(*sys.argv[1:])
tier = ui.t('bounty.tier.very_reliable')
level = ui.t('reputation.level.label', level=4, name=ui.t('reputation.level.lv4'))
reach_home(ui)
ui.tap('tab-me')
row = ui.wait_label('me-profile', lambda text: tier in text and level in text,
                    'the name row never showed the tier and the level', timeout=30)
assert row.get('type') == 'Button', row.get('type')
assert_touch_target(row, '我的名字那行')
ui.at_rest()
shot = ui.snap('00-me')
f = row['frame']
read = [{**line, 'text': line['text'].upper()} for line in lines_in(shot, ui.locale)]
assert one_line(read, level.upper(), f), f'{level} is not read on one line in the name row'
disc = shot.rgb(f['x'] + 30, f['y'] + f['height'] / 2 - 15)
assert close(disc, token('--color-card-calm', ui.appearance), 8), f'the avatar is not the cream initial disc: {disc}'
ui.tap('me-profile')
open_profile(ui)
assert [call['personId'] for call in rep_calls(ui, 'profile', 1)] == ['00000000-0000-4000-8000-000000000001']
ui.element('profile-level')
ui.at_rest()
ui.capture('01-self')
ui.tap('BackButton')
ui.gone('profile-screen')
ui.element('me-profile')
ui.at_rest()
shot = ui.snap('02-back')
f = by_id(ui.read(), 'me-profile')['frame']
fill = shot.rgb(f['x'] + f['width'] * 0.8, f['y'] + f['height'] / 2)
assert close(fill, CELL[ui.appearance], 8), f'the name row stays highlighted: {fill}'

relaunch(ui, drop=[], add=['-uiVerifyRepFail', 'profile'])
ui.tap('tab-me')
ui.element('me-profile', timeout=30)
assert rep_calls(ui, 'profile', 1), 'the 我的 tab never read the profile'
time.sleep(2)  # the failed answer has landed; a line now would be data the read did not return
text = by_id(ui.read(), 'me-profile').get('AXLabel') or ''
assert tier not in text and 'Lv.' not in text, f'the name row shows a tier after a failed read: {text!r}'
ui.at_rest()
ui.capture('03-failed')
print('PASS: the 我的 name row shows the tier and level, pushes your own profile, and drops the line on a failed read')
