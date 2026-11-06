"""Entry from the applicant list (247 A): each row's avatar is its own 44 pt button 看阿杰的主页 that pushes 阿杰's profile
(one read for fixture-applicant-jie) and back returns to the list; tapping the rest of a row still chooses (the hold button
names Hana), and long-pressing a row offers 看Hana的主页 beside 屏蔽Hana."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from choose import choose  # noqa: E402
from driver import UI, assert_touch_target  # noqa: E402
from profile import open_profile, rep_calls  # noqa: E402

DEPS = ['src/features/bounty/select/', 'src/app/(tabs)/bounty/', 'src/features/reputation/profile/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
SCENE = 'bounty-applicants'
ARGS = ['-uiVerifySignedIn', 'onboarded']
AVATAR = 'bounty-applicant-profile-fixture-applicant-jie'

ui = UI(*sys.argv[1:])
avatar = ui.element(AVATAR, timeout=45)
assert avatar.get('AXLabel') == ui.t('reputation.profile.open', name='阿杰'), avatar.get('AXLabel')
assert_touch_target(avatar, '阿杰的头像')
ui.at_rest()
ui.capture('01-list')
ui.tap(AVATAR)
open_profile(ui)
assert [call['personId'] for call in rep_calls(ui, 'profile', 1)] == ['fixture-applicant-jie']
ui.at_rest()
ui.capture('02-profile')
ui.tap('BackButton')
ui.gone('profile-screen')
choose(ui, 'fixture-applicant-hana', 'Hana')
assert len(rep_calls(ui, 'profile', 2, timeout=2)) == 1, 'choosing a row opened a profile'
ui.press('bounty-applicant-fixture-applicant-hana', 1.2)
ui.labelled(ui.t('reputation.profile.open', name='Hana'))
ui.labelled(ui.t('block.menu', name='Hana'))
ui.at_rest()
ui.capture('03-menu')
print('PASS: the avatar opens the profile, the row still chooses, and the long press offers the profile')
