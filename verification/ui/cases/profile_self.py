"""Your own profile keeps the RepBC order (245 A): header, the three numbers, the 小貘等级 · 只升不降 card (Lv.4 少年貘, 再收 2 张贴纸
→ Lv.5 青年貘, 小红帽 / 书包 / 雨伞 unlocked and 围巾 locked at Lv.5), 一起办成的事 with 23 张, then the reviews; a review with no
reply offers 回复 (44 pt) and the one already answered reads 我的回复：…; there is no ⋯; 一起办成的事 opens the sticker book."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from gestures import drag  # noqa: E402
from profile import (assert_order, label, open_profile,  # noqa: E402
                     review_id)

DEPS = ['src/features/reputation/', 'src/app/(tabs)/', 'src/ui/TierMark.tsx', 'src/ui/Avatar.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/Mascot.tsx', 'src/lib/report.ts', 'src/lib/i18n/locales/reputation/', 'src/features/block/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py', 'src/features/stickers/']
SCENE = 'profile'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson', '00000000-0000-4000-8000-000000000001', '-uiVerifyProfileTab', 'me']

ui = UI(*sys.argv[1:])
open_profile(ui)
items = ui.read()
assert by_id(items, 'profile-level'), 'your own profile has no level card'
assert not [i for i in items if i.get('AXLabel') == ui.t('reputation.profile.more')], 'your own profile shows ⋯'
level = label(ui, 'profile-level')
lv4 = ui.t('reputation.level.label', level=4, name=ui.t('reputation.level.lv4'))
lv5 = ui.t('reputation.level.label', level=5, name=ui.t('reputation.level.lv5'))
assert lv4 in level and ui.tn('reputation.profile.nextLevel', 2, label=lv5) in level, level
for accessory in ('red_hat', 'backpack', 'umbrella'):
    name = ui.t(f'reputation.accessory.{accessory}')
    found = label(ui, f'profile-accessory-{accessory}')
    assert found == ui.t('reputation.profile.accessoryUnlockedA11y', name=name), found
scarf = label(ui, 'profile-accessory-scarf')
assert scarf == ui.t('reputation.profile.accessoryLockedA11y', name=ui.t('reputation.accessory.scarf'), level=5), scarf
assert_order(items, 'profile-name', 'profile-helped', 'profile-level', 'profile-accessory-scarf')
ui.at_rest()
ui.capture('01-top')

w, h = items[0]['frame']['width'], items[0]['frame']['height']
for _ in range(4):
    if by_id(ui.read(), f'{review_id(1)}-reply-button'):
        break
    drag(ui, (w / 2, h * 0.75), (w / 2, h * 0.35))
items = ui.read()
assert_order(items, 'profile-stickers', 'profile-faces', review_id(1))
stickers = by_id(items, 'profile-stickers').get('AXLabel') or ''
assert ui.t('stickers.book.title') in stickers and ui.tn('stickers.count', 23) in stickers, stickers
reply = by_id(items, f'{review_id(1)}-reply-button')
assert reply.get('AXLabel') == ui.t('reputation.reply.action'), reply.get('AXLabel')
assert_touch_target(reply, '回复')
assert by_id(items, f'{review_id(2)}-reply-button') is None, 'an answered review still offers 回复'
answered = label(ui, f'{review_id(2)}-reply')
assert answered.startswith(ui.t('reputation.reply.mine')), answered
ui.at_rest()
ui.capture('02-reviews')

ui.tap('profile-stickers')
ui.element('sticker-book', timeout=30)
ui.at_rest()
ui.capture('03-stickers')
print('PASS: your own profile keeps the RepBC order, offers 回复 once per review and opens the sticker book')
