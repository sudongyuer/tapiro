"""A failed first load (`-uiVerifyRepFail profile`) shows 没加载出来 with 重试 and nothing else (no header, no 还没有评价, no ⋯);
重试 loads Mei's profile. A failed reload of a shown profile (`profileAgain`, a pull to refresh) keeps the profile and adds
「没刷新成功 · 下面是上次加载的主页」 with 重试, which brings it back to current; no read repeats on its own."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, by_id  # noqa: E402
from gestures import pull  # noqa: E402
from profile import label, open_profile, rep_calls  # noqa: E402

DEPS = ['src/features/reputation/', 'src/app/(tabs)/', 'src/ui/TierMark.tsx', 'src/ui/Avatar.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/Mascot.tsx', 'src/lib/report.ts', 'src/lib/i18n/locales/reputation/', 'src/features/block/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py', 'verification/ui/gestures.py']
SCENE = 'profile'
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson', 'fixture-person-mei', '-uiVerifyRepFail', 'profile']

ui = UI(*sys.argv[1:])
ui.element('profile-failed', timeout=45)
items = ui.read()
assert ui.t('reputation.profile.failed') in (by_id(items, 'profile-failed').get('AXLabel') or ''), \
    by_id(items, 'profile-failed').get('AXLabel')
for missing in ('profile-name', 'profile-no-reviews', 'profile-helped'):
    assert by_id(items, missing) is None, f'{missing} shows on a failed load'
assert not [i for i in items if i.get('AXLabel') == ui.t('reputation.profile.more')], '⋯ shows with no profile'
time.sleep(2)  # a replay would follow the failed answer
reads = rep_calls(ui, 'profile', 2, timeout=2)
assert len(reads) == 1, f'the failed read was repeated on its own: {reads} {defaults(ui, "uiVerifyRepCalls")}'
ui.at_rest()
ui.capture('01-failed')
ui.tap('profile-retry')
open_profile(ui)
assert label(ui, 'profile-name') == 'Mei'
assert by_id(ui.read(), 'profile-failed') is None
ui.at_rest()
ui.capture('02-retried')

relaunch(ui, drop=['-uiVerifyRepFail', 'profile'], add=['-uiVerifyRepFail', 'profileAgain', '-uiVerifyScene', SCENE],
         ready='profile-screen')
open_profile(ui)
pull(ui, ui.read())
ui.element('profile-stale', timeout=30)
items = ui.read()
assert ui.t('reputation.profile.stale') in (by_id(items, 'profile-stale').get('AXLabel') or '')
assert by_id(items, 'profile-name').get('AXLabel') == 'Mei', 'a stale reload dropped the shown profile'
ui.at_rest()
ui.capture('03-stale')
ui.tap('profile-retry')
ui.gone('profile-stale', timeout=30)
assert by_id(ui.read(), 'profile-name') is not None
ui.at_rest()
ui.capture('04-current')
print('PASS: a failed load is never shown as empty, a failed reload keeps the profile marked stale, 重试 recovers')
