"""The post draft stays on the device: a typed title and reward survive 取消, a swipe down and an app relaunch, and
清空草稿 (confirmed in the action sheet) empties the form for good, also after a relaunch."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import CANCEL, TITLE_SHOWN, TITLE_TYPED, close_sheet_by_swipe, open_post, relaunch, tap_sheet_action, typed, value  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'none']
BUDGET = 240
TITLE, REWARD = TITLE_SHOWN, '12'

ui = UI(*sys.argv[1:])


def assert_kept(after):
    ui.wait(lambda items: value(ui, 'bounty-post-title') == TITLE and value(ui, 'bounty-post-reward') == REWARD,
            f'draft not kept after {after}: title {value(ui, "bounty-post-title")!r}, '
            f'reward {value(ui, "bounty-post-reward")!r}')


open_post(ui)
assert value(ui, 'bounty-post-title') == '' and value(ui, 'bounty-post-reward') == '', 'form did not start empty'
typed(ui, 'bounty-post-title', TITLE_TYPED, TITLE)
typed(ui, 'bounty-post-reward', REWARD)
ui.capture('01-typed')

ui.tap_label(ui.t(CANCEL))
ui.gone('bounty-post-form')
open_post(ui)
assert_kept('取消')

close_sheet_by_swipe(ui)
open_post(ui)
assert_kept('a swipe down')

relaunch(ui)
open_post(ui)
assert_kept('a relaunch')
ui.capture('02-after-relaunch')

ui.tap('bounty-post-clear')
tap_sheet_action(ui, ui.t('bounty.post.form.clearConfirm.confirm'), 'bounty-post-clear')
ui.wait(lambda items: value(ui, 'bounty-post-title') == '' and value(ui, 'bounty-post-reward') == '',
        '清空草稿 did not empty the form')
ui.gone('bounty-post-clear')
ui.capture('03-cleared')
ui.tap_label(ui.t(CANCEL))
relaunch(ui)
open_post(ui)
assert value(ui, 'bounty-post-title') == '' and value(ui, 'bounty-post-reward') == '', 'the cleared draft came back after a relaunch'
print('PASS: the draft survives 取消, swipe down and relaunch, and 清空草稿 empties it across a relaunch')
