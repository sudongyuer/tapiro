"""248 A, worst data: 貘友 → 靠谱 with five no-shows (three listed: two long titles and a ride without one), twelve
negative reviews and all three steps back; in ms every line wraps inside the sheet and both buttons stay on screen."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from tier_drop import KEY, assert_sheet, no_show_pattern, open_sheet, plural, way_back  # noqa: E402

DEPS = ['src/features/reputation/', 'src/lib/i18n/locales/bounty/', 'src/features/account/', 'src/app/tier-drop.tsx', 'src/app/_layout.tsx', 'src/app/(tabs)/_layout.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/AppText.tsx', 'verification/ui/tier_drop.py', 'verification/ui/profile.py', 'verification/ui/board.py', 'verification/ui/choose.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyTierDrop', 'worst']
TITLES = ['Ambil bungkusan besar dari Sunway Pyramid ke Sunway Geo Residences sebelum pukul lapan malam',
          '帮忙去 Sunway Pyramid 地下一层的超市买一箱矿泉水和两袋大米，送到 Sunway Geo Residences A 座 12 楼']

ui = UI(*sys.argv[1:])
open_sheet(ui)
titles = TITLES + [ui.t(f'{KEY}.ride')]
assert_sheet(ui, 'reliable', [no_show_pattern(ui, 5, titles), plural(ui, 'reviewsAlso', 12)],
             way_back(ui, 'tapir_friend', settled=12, people=6, reviews=18))
ui.capture('01-sheet')
print('PASS: the worst drop fits the sheet')
