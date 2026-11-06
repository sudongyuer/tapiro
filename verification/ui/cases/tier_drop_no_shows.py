"""248 A, a drop for one no-show: the first open shows one medium sheet over home, 靠谱度变成了「靠谱」, the no-show
with its date and title, the way back (再顺利完成 2 次、帮到 1 个新的人 → 很靠谱), 知道了 and 看我的主页 at 44 pt; 知道了
closes it and marks drop 1 seen."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen  # noqa: E402
from driver import UI, by_id  # noqa: E402
from tier_drop import SHEET, assert_seen_once, assert_sheet, no_show_pattern, open_sheet, seen_ids, way_back  # noqa: E402

DEPS = ['src/features/reputation/', 'src/lib/i18n/locales/bounty/', 'src/features/account/', 'src/app/tier-drop.tsx', 'src/app/_layout.tsx', 'src/app/(tabs)/_layout.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/AppText.tsx', 'verification/ui/tier_drop.py', 'verification/ui/profile.py', 'verification/ui/board.py', 'verification/ui/choose.py']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyTierDrop', 'noShows']
MEDIUM = 0.6

ui = UI(*sys.argv[1:])
items = open_sheet(ui)
assert_sheet(ui, 'reliable', [no_show_pattern(ui, 1, ['帮取快递'])], way_back(ui, 'very_reliable', settled=2, people=1))
top = by_id(items, 'tier-drop-title')['frame']['y']
height = screen(items)['height']
assert top > height * (1 - MEDIUM), f'the sheet starts at {top:.0f} pt of {height:.0f}, not a medium sheet'
ui.capture('01-sheet')
assert not seen_ids(ui, timeout=1), 'the drop was marked seen before it was dismissed'
ui.tap('tier-drop-got-it')
ui.gone(SHEET)
ui.element('home-scroll')
assert_seen_once(ui, '知道了 did not mark drop 1 seen')
ui.at_rest()
ui.capture('02-dismissed')
print(f'PASS: the no-show sheet starts at {top:.0f} pt of {height:.0f} and 知道了 marks it seen')
