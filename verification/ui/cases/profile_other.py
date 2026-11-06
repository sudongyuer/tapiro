"""Someone else's profile (245 A, 246 A): Mei's header reads her name and 很靠谱 · 近 180 天; the three numbers read 帮过的人 9,
完成率 96%, 评价 24; the reviews come before the one 小貘 row; 开心 20 · 一般 3 · 不开心 1 heads the latest 3 rows, the second
shows 不开心 · 迟到 with Mei's reply under it, the third is a ride review that reads only 拼车 (the fixture strips the route and reviewer as the server does, 256 A;
the server side is pgTAP);
there is no 回复 on someone else's profile; 全部 24 条评价 pushes the list, which pages in the rest (20, then 4, cursor after the 20th) as it scrolls, and the back button returns with the row
deselected; ⋯ offers 举报 Mei and 屏蔽 Mei."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, close  # noqa: E402
from profile import (assert_order, label, menu_more, open_profile, rep_calls, review_id,  # noqa: E402
                     review_ids, scroll_to, within_width)

DEPS = ['src/features/reputation/', 'src/app/(tabs)/', 'src/ui/TierMark.tsx', 'src/ui/Avatar.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/Mascot.tsx', 'src/lib/report.ts', 'src/lib/i18n/locales/reputation/', 'src/features/block/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
SCENE = 'profile'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson', 'fixture-person-mei']
CELL = {'light': (255, 255, 255), 'dark': (28, 28, 30)}

ui = UI(*sys.argv[1:])
open_profile(ui)
assert label(ui, 'profile-name') == 'Mei', label(ui, 'profile-name')
tier = label(ui, 'profile-tier')
assert ui.t('bounty.tier.very_reliable') in tier and ui.t('reputation.profile.recent') in tier, tier
assert label(ui, 'profile-helped') == f"{ui.t('reputation.profile.helped')} 9", label(ui, 'profile-helped')
assert label(ui, 'profile-rate') == f"{ui.t('reputation.profile.completionRate')} 96%", label(ui, 'profile-rate')
assert label(ui, 'profile-count-reviews') == f"{ui.t('reputation.profile.reviews')} 24", label(ui, 'profile-count-reviews')
assert label(ui, 'profile-faces') == ui.t('reputation.profile.faces', happy=20, okay=3, unhappy=1), \
    label(ui, 'profile-faces')

items = ui.read()
assert review_ids(items) == [review_id(1), review_id(2), review_id(3)], review_ids(items)
second = label(ui, review_id(2))
assert second.startswith(f"{ui.t('reputation.face.unhappy')} · {ui.t('reputation.chip.helper.late')}"), second
assert ui.t('reputation.reply.theirs', name='Mei') + '那天电梯坏了' in second, second
ride = label(ui, review_id(3))
assert ride.endswith(ui.t('reputation.profile.ride')), ride
assert '阿明' not in ride and '帮取快递' not in ride, f'a ride review names the reviewer or route: {ride}'
assert not [i for i in items if (i.get('AXUniqueId') or '').endswith('-reply-button')], 'someone else gets 回复'
assert by_id(items, 'profile-level') is None, 'the level card belongs to your own profile'
within_width(items, 'profile-name')
ui.at_rest()
ui.capture('01-top')

scroll_to(ui, 'profile-mascot')
items = ui.read()
assert label(ui, 'profile-mascot') == \
    f"{ui.t('reputation.level.label', level=4, name=ui.t('reputation.level.lv4'))} · {ui.tn('reputation.level.stickers', 23)}"
assert_order(items, 'profile-faces', 'profile-all-reviews', 'profile-mascot')
all_row = by_id(items, 'profile-all-reviews')
assert all_row.get('AXLabel') == ui.tn('reputation.profile.allReviews', 24), all_row.get('AXLabel')
assert_touch_target(all_row, '全部评价')
ui.at_rest()
ui.capture('02-bottom')

ui.tap('profile-all-reviews')
ui.element('profile-reviews', timeout=30)
ui.element(review_id(1), timeout=30)
ui.at_rest()
ui.capture('03-all')
scroll_to(ui, review_id(24), tries=20)
pages = rep_calls(ui, 'profileReviews', 2)
assert [page['before'] for page in pages] == [None, 'fixture-profile-review-020'], pages
ui.at_rest()
ui.capture('03b-paged')
ui.tap('BackButton')
ui.gone('profile-reviews')
ui.at_rest()
shot = ui.snap('04-back')
row = by_id(ui.read(), 'profile-all-reviews')['frame']
fill = shot.rgb(row['x'] + row['width'] * 0.6, row['y'] + row['height'] / 2)
assert close(fill, CELL[ui.appearance], 8), f'全部评价 stays highlighted after the return: {fill}'

menu_more(ui)
ui.labelled(ui.t('reputation.profile.report', name='Mei'))
ui.labelled(ui.t('reputation.profile.block', name='Mei'))
ui.at_rest()
ui.capture('05-menu')
print('PASS: others see trust first, ride reviews read 拼车, 全部评价 pushes and returns deselected, ⋯ has 举报 and 屏蔽')
