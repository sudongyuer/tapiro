"""248 A, a drop for a no-show and negative reviews: two reasons, the reviews line reading 还有…; dragging the sheet down
closes it and marks it seen, like 知道了."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from gestures import drag  # noqa: E402
from tier_drop import SHEET, assert_seen_once, assert_sheet, no_show_pattern, open_sheet, plural, way_back  # noqa: E402

DEPS = ['src/features/reputation/', 'src/lib/i18n/locales/bounty/', 'src/features/account/', 'src/app/tier-drop.tsx', 'src/app/_layout.tsx', 'src/app/(tabs)/_layout.tsx', 'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/AppText.tsx', 'verification/ui/tier_drop.py', 'verification/ui/profile.py', 'verification/ui/board.py', 'verification/ui/choose.py', 'verification/ui/gestures.py']
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyTierDrop', 'both']

ui = UI(*sys.argv[1:])
items = open_sheet(ui)
assert_sheet(ui, 'reliable', [no_show_pattern(ui, 1, ['帮取快递']), plural(ui, 'reviewsAlso', 2)],
             way_back(ui, 'very_reliable', settled=2, people=1, reviews=3))
ui.capture('01-sheet')
top = by_id(items, 'tier-drop-title')['frame']
x = items[0]['frame']['width'] / 2
drag(ui, (x, top['y'] - 30), (x, items[0]['frame']['height'] - 20), duration=0.6, steps=30)
ui.gone(SHEET)
assert_seen_once(ui, 'closing the sheet by dragging it down did not mark it seen')
ui.element('home-scroll')
print('PASS: both reasons, and a drag down marks the drop seen')
