"""A deleted account's profile reads 这个账号已经注销了 with 返回 (44 pt), not a retryable failure; there is no ⋯; 返回 pops
back to where it came from."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402


DEPS = ['src/features/reputation/', 'src/app/(tabs)/', 'src/ui/TierMark.tsx', 'src/ui/Avatar.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/Mascot.tsx', 'src/lib/report.ts', 'src/lib/i18n/locales/reputation/', 'src/features/block/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
SCENE = 'profile'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson', 'fixture-person-gone']

ui = UI(*sys.argv[1:])
gone = ui.element('profile-gone', timeout=45)
assert gone.get('AXLabel') == ui.t('reputation.profile.gone'), gone.get('AXLabel')
items = ui.read()
back = by_id(items, 'profile-back')
assert back.get('AXLabel') == ui.t('reputation.profile.back'), back.get('AXLabel')
assert_touch_target(back, '返回')
for missing in ('profile-failed', 'profile-retry', 'profile-name'):
    assert by_id(items, missing) is None, f'{missing} shows for a deleted account'
assert not [i for i in items if i.get('AXLabel') == ui.t('reputation.profile.more')], '⋯ shows for a deleted account'
ui.at_rest()
ui.capture('01-gone')
ui.tap('profile-back')
ui.gone('profile-gone')
ui.element('home-scroll', timeout=30)
print('PASS: a deleted account reads 这个账号已经注销了 and 返回 pops')
