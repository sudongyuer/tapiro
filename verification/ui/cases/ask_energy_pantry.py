"""The pantry on 我的 → 小貘 (137, 139). Under the cloud switch a crayon jar shows how many leaves are kept and that they
never expire, with 用 1 颗貘币换一片 and the coin balance. The swap asks first in a system action sheet naming what is
left; 取消 sends nothing; 换一片 shows progress, swaps once and puts the leaf in the jar without feeding it. A swap that
gets no answer says it may not have gone through and is not retried; with no coins the button is disabled."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import assert_calls  # noqa: E402
from bounty import relaunch, tap_sheet_action  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/app/(tabs)/me/', 'src/lib/i18n/locales/ask/', 'assets/pantry/',
        'verification/ui/ask.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 360
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'given',
        '-uiVerifyAiDelayMs', '2500', '-uiVerifyAiBelly', '1000,2,3,5']
BELLY = ['-uiVerifyAiBelly', '1000,2,3,5']

ui = UI(*sys.argv[1:])


def open_page():
    ui.tap('tab-me')
    ui.tap('me-tapir')
    ui.element('tapir-settings-screen', timeout=30)


def count(leaves):
    expected = ui.t('ask.pantry.count', count=leaves)
    ui.wait(lambda items: any(i.get('AXUniqueId') == 'tapir-pantry-jar' and expected in (i.get('AXLabel') or '')
                              for i in items), f'the jar does not read {expected}')


def footer_has(text):
    ui.wait(lambda items: text in ((by_id(items, 'tapir-pantry-footer') or {}).get('AXLabel') or ''),
            f'the pantry footer does not say {text}')


reach_home(ui)
open_page()
count(2)
footer_has(ui.t('ask.pantry.coins', count=3))
assert ui.t('ask.pantry.never') in by_id(ui.read(), 'tapir-pantry-jar')['AXLabel']
ui.at_rest()
ui.capture('01-jar')

ui.tap('tapir-pantry-swap')
ui.labelled(ui.t('ask.pantry.swapTitle'))
ui.capture('02-confirm')
tap_sheet_action(ui, ui.t('ask.hungry.cancel'), 'tapir-pantry-swap')
assert_calls(ui, 'pantry', 0, wait=1)
count(2)

ui.tap('tapir-pantry-swap')
tap_sheet_action(ui, ui.t('ask.hungry.swapConfirm'), 'tapir-pantry-swap')
ui.element('tapir-pantry-swapping', timeout=10)
ui.capture('03-swapping')
count(3)
footer_has(ui.t('ask.pantry.coins', count=2))
assert assert_calls(ui, 'pantry', 1, wait=1) == [{'kind': 'swap'}]
ui.at_rest()
ui.capture('04-swapped')

relaunch(ui, drop=BELLY, add=['-uiVerifyAiBelly', '1000,0,1,5', '-uiVerifyAiFail', 'pantry'])
open_page()
count(0)
ui.tap('tapir-pantry-swap')
tap_sheet_action(ui, ui.t('ask.hungry.swapConfirm'), 'tapir-pantry-swap')
footer_has(ui.t('ask.pantryFailure.failed'))
assert_calls(ui, 'pantry', 1, wait=3)
count(0)
ui.at_rest()
ui.capture('05-failed')

relaunch(ui, drop=BELLY, add=['-uiVerifyAiBelly', '1000,0,0,5'])
open_page()
count(0)
footer_has(ui.t('ask.pantry.noCoins'))
assert by_id(ui.read(), 'tapir-pantry-swap').get('enabled') is False, 'the swap is enabled with no coins'
ui.at_rest()
ui.capture('06-no-coins')
print('PASS: jar count and coins, swap confirmed in an action sheet with progress, cancel sends nothing, '
      'a lost swap is named and not retried, no coins disables the swap')
