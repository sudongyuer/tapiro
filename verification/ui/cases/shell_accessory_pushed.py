"""The bottom accessory shows the most urgent item on a tab root and hides on a pushed page, which has its own action
bar: on a bounty's 进度 page with 去付款 the strip said 「付给阿杰 RM 15.00」 for another payment, two money prompts at once
(audit H3). 我的 shows the strip, 设置 pushed over it hides it, and back on 我的 it returns."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, accessory, reach_home, selected  # noqa: E402

DEPS = ['src/features/shell/', 'src/app/(tabs)/_layout.tsx', 'src/lib/liveItems.ts']
ARGS = ['-uiVerifySignedIn', 'onboarded']
BUDGET = 120

ui = UI(*sys.argv[1:])

reach_home(ui)
ui.tap('tab-me')
ui.wait(lambda items: selected(items) == ['tab-me'] and accessory(items), '我的 is not selected with the accessory shown')
ui.snap('01-me-root')

ui.tap('me-settings')
ui.element('BackButton')
ui.wait(lambda items: accessory(items) is None, 'the accessory stays on the pushed 设置 page', timeout=10)
ui.snap('02-settings-pushed')

ui.tap('BackButton')
ui.wait(lambda items: accessory(items), 'the accessory did not come back on 我的', timeout=10)
ui.snap('03-me-again')
print('PASS: the accessory shows on the 我的 root, hides on the pushed 设置 page and returns on the way back')
