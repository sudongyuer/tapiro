"""A new user (246 A, `-uiVerifyProfile empty`): 新朋友 · 刚来 Tapiro, 帮过的人 0, 完成率 满 5 单显示 (never 0%), 评价 0, one
「还没有评价」 row with no faces line and no 全部评价, and the 小貘 row reads Lv.1 貘宝宝 · 0 张贴纸."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import label, open_profile  # noqa: E402

DEPS = ['src/features/reputation/', 'src/app/(tabs)/', 'src/ui/TierMark.tsx', 'src/ui/Avatar.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/Mascot.tsx', 'src/lib/report.ts', 'src/lib/i18n/locales/reputation/', 'src/features/block/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
SCENE = 'profile'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson', 'fixture-person-mei', '-uiVerifyProfile', 'empty']

ui = UI(*sys.argv[1:])
open_profile(ui)
tier = label(ui, 'profile-tier')
assert ui.t('bounty.tier.new_friend') in tier and ui.t('reputation.profile.newcomer') in tier, tier
assert label(ui, 'profile-helped') == f"{ui.t('reputation.profile.helped')} 0", label(ui, 'profile-helped')
rate = label(ui, 'profile-rate')
assert rate == f"{ui.t('reputation.profile.completionRate')} {ui.t('reputation.profile.rateAfterFive')}", rate
assert '%' not in rate, rate
assert label(ui, 'profile-count-reviews') == f"{ui.t('reputation.profile.reviews')} 0"
ui.element('profile-no-reviews')
items = ui.read()
assert by_id(items, 'profile-no-reviews').get('AXLabel') == ui.t('reputation.profile.noReviews')
for missing in ('profile-faces', 'profile-all-reviews'):
    assert by_id(items, missing) is None, f'{missing} shows with no reviews'
assert label(ui, 'profile-mascot') == \
    f"{ui.t('reputation.level.label', level=1, name=ui.t('reputation.level.lv1'))} · {ui.tn('reputation.level.stickers', 0)}"
ui.at_rest()
ui.capture('01-new')
print('PASS: a new user reads 还没有评价 and 满 5 单显示, never 0% or an empty failure')
