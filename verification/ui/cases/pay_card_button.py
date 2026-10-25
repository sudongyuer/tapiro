"""The home pay card shows a 去付款 button instead of the slider; tapping it opens the pay sheet for that payment (付给阿杰, RM 15.00)."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402

DEPS = ['src/features/home/', 'src/features/payment/', 'src/app/pay/', 'src/app/(tabs)/', 'src/features/shell/']
ARGS = ['-uiVerifyShellFeed', 'oweMoney', '-uiVerifySignedIn', 'onboarded']

ui = UI(*sys.argv[1:])
reach_home(ui)
card = ui.settled(lambda items: by_id(items, 'live-card-oweMoney'), 'pay card missing')
assert '去付款' in (card.get('AXLabel') or ''), f'card label {card.get("AXLabel")!r}'
assert_touch_target(card, 'pay card')
ui.capture('01-card')
ui.tap('live-card-oweMoney')
amount = ui.element('pay-amount', timeout=15)
label = amount.get('AXLabel') or ''
assert '付给阿杰' in label and re.search(r'RM\s?15\.00', label), label
ui.capture('02-sheet')
print('PASS: 去付款 opens the pay sheet')
