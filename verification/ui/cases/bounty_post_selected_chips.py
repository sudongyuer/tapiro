"""The chips picked in the post form read against their fill: with 取快递 open, a tapped amount and a tapped quick time
fill with the accent and carry the on-accent label (WCAG 4.5:1, pixels, light and dark). Reached without typing, since
AXe key events drop on iOS 27.2."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import form_scroll_to, open_post, value  # noqa: E402
from driver import UI, by_id, token  # noqa: E402
from readable import assert_label_reads  # noqa: E402

DEPS = ['src/features/bounty/post/', 'src/app/bounty-post/', 'verification/ui/bounty.py', 'verification/ui/readable.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'none']
BUDGET = 180

ui = UI(*sys.argv[1:])
accent = token('--color-accent', ui.appearance)
open_post(ui, 'pickup')
form_scroll_to(ui, 'bounty-post-amount-8')
ui.tap('bounty-post-amount-8')
ui.wait(lambda items: value(ui, 'bounty-post-reward') == '8', 'the RM 8 button did not fill the reward')
ui.at_rest()
items = ui.read()
assert_label_reads(ui.snap('01-amount-selected'), by_id(items, 'bounty-post-amount-8')['frame'], 'selected RM 8',
                   accent)

form_scroll_to(ui, 'bounty-post-add-time')
ui.tap('bounty-post-add-time')
pick = ui.wait(lambda items: next((i for i in items if str(i.get('AXUniqueId')).startswith('bounty-post-pick-time-')), None),
               'no quick time shows')['AXUniqueId']
form_scroll_to(ui, pick)
ui.tap(pick)
ui.at_rest()
items = ui.read()
assert_label_reads(ui.snap('02-time-selected'), by_id(items, pick)['frame'], f'selected {pick}', accent)
print('PASS: a picked amount and quick time read against the accent fill')
