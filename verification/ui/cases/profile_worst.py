"""Worst case (246 A, `-uiVerifyProfile worst`): a 45-character name stays on one line inside the screen while VoiceOver
reads it whole; 帮过的人 87, 完成率 99%, 评价 128 with the real count in 全部 128 条评价 (never 99+); a review with all four
not-good chips and a 70-character sentence wraps inside the row; the 小貘 row reads Lv.85 大貘 · 1234 张贴纸. Runs in ms for
the longest chips."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from gestures import drag  # noqa: E402
from profile import label, open_profile, review_id, within_width  # noqa: E402

DEPS = ['src/features/reputation/', 'src/app/(tabs)/', 'src/ui/TierMark.tsx', 'src/ui/Avatar.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/Mascot.tsx', 'src/lib/report.ts', 'src/lib/i18n/locales/reputation/', 'src/features/block/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
SCENE = 'profile'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson', 'fixture-person-mei', '-uiVerifyProfile', 'worst']
NAME = 'Muhammad Aiman bin Abdullah Hakimi Zulkarnain'

ui = UI(*sys.argv[1:])
name = open_profile(ui)
assert name.get('AXLabel') == NAME, name.get('AXLabel')
assert name['frame']['height'] < 50, f'the name wraps: {name["frame"]}'
items = ui.read()
within_width(items, 'profile-name')
assert label(ui, 'profile-helped').endswith(' 87'), label(ui, 'profile-helped')
assert label(ui, 'profile-rate').endswith(' 99%'), label(ui, 'profile-rate')
assert label(ui, 'profile-count-reviews').endswith(' 128'), label(ui, 'profile-count-reviews')
for identifier in ('profile-helped', 'profile-rate', 'profile-count-reviews'):
    within_width(items, identifier)
worst = label(ui, review_id(2))
for chip in ('late', 'no_heads_up', 'unfinished', 'item_damaged'):
    assert ui.t(f'reputation.chip.helper.{chip}') in worst, f'{chip} missing: {worst}'
within_width(items, review_id(2))
ui.at_rest()
ui.capture('01-top')

w, h = items[0]['frame']['width'], items[0]['frame']['height']
for _ in range(4):
    if by_id(ui.read(), 'profile-mascot'):
        break
    drag(ui, (w / 2, h * 0.75), (w / 2, h * 0.3))
items = ui.read()
all_row = by_id(items, 'profile-all-reviews')
assert all_row.get('AXLabel') == ui.tn('reputation.profile.allReviews', 128), all_row.get('AXLabel')
assert '99+' not in all_row.get('AXLabel'), all_row.get('AXLabel')
mascot = label(ui, 'profile-mascot')
assert mascot == f"{ui.t('reputation.level.label', level=85, name=ui.t('reputation.level.grown'))} · " \
                 f"{ui.tn('reputation.level.stickers', 1234)}", mascot
within_width(items, 'profile-mascot')
ui.at_rest()
ui.capture('02-bottom')
print('PASS: the worst profile keeps the long name on one line, real counts and wrapped chips')
