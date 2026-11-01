"""The tile screen (157 C+A, 158A, 159A, 162A): with no draft 「+」 opens 「要帮什么忙？」 with six hand-drawn tiles and
「都不像，直接写」, each tile 44 pt and read with its hint. 取快递 opens the form with 代取 and the parcel on the live
card, the parcel title example, 「几点前」 and 「在哪取」 rows and RM 5 / 6 / 8 / 10. The system back 「‹ 换一件事」 returns
to the tiles; 排队 keeps the typed title and switches the card to 代排, the amounts to RM 15 / 20 / 25 / 30 and the time
row to 「哪天」. A relaunch with the draft kept opens the form directly with the tiles beneath it, and 清空草稿 returns
to the tiles."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import KINDS, form_scroll_to, open_sheet, relaunch, tap_sheet_action, typed, value  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/bounty/post/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'src/ui/TaskCard.tsx',
        'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'none']
BUDGET = 240
TITLE_TYPED, TITLE_SHOWN = 'help me', 'Help me'

ui = UI(*sys.argv[1:])


def assert_kind(kind, art, amounts):
    ui.wait_label('bounty-post-live-text', lambda label: label.startswith(ui.t(f'bounty.category.{kind}')),
                  f'the live card does not show {kind}')
    expected = ui.t('bounty.post.form.art', name=ui.t(f'stickers.art.{art}'))
    ui.wait_label('bounty-post-live-art', lambda label: label == expected, f'the live card art is not {art}')
    for amount in amounts:
        ui.element(f'bounty-post-amount-{amount}')
    when = ui.t(f'bounty.post.kind.{kind}.when')
    ui.wait_label('bounty-post-add-time', lambda label: label == when, f'the time row is not {when!r}')


open_sheet(ui)
ui.element('bounty-post-pick')
items = ui.read()
for kind in KINDS:
    tile = by_id(items, f'bounty-post-pick-{kind}')
    assert tile, f'the {kind} tile is missing'
    assert_touch_target(tile, f'{kind} tile')
    name, hint = ui.t(f'bounty.post.kind.{kind}.tile'), ui.t(f'bounty.post.kind.{kind}.hint')
    assert tile.get('AXLabel') == ui.t('bounty.post.pick.tileLabel', name=name, hint=hint), tile.get('AXLabel')
assert_touch_target(by_id(items, 'bounty-post-pick-free'), '直接写')
ui.capture('01-pick')

ui.tap('bounty-post-pick-pickup')
ui.element('bounty-post-form')
assert_kind('pickup', 'parcel', [5, 6, 8, 10])
ui.wait(lambda items: (by_id(items, 'bounty-post-title') or {}).get('AXValue') == ui.t('bounty.post.kind.pickup.title'),
        'the title field does not show the parcel example')
ui.capture('02-form-pickup')
typed(ui, 'bounty-post-title', TITLE_TYPED, TITLE_SHOWN)
place = form_scroll_to(ui, 'bounty-post-add-place')
assert place.get('AXLabel') == ui.t('bounty.post.kind.pickup.place'), place.get('AXLabel')
ui.tap('BackButton')
ui.element('bounty-post-pick')
ui.tap('bounty-post-pick-queue')
ui.element('bounty-post-form')
assert_kind('queue', 'queue', [15, 20, 25, 30])
assert value(ui, 'bounty-post-title') == TITLE_SHOWN, 'the typed title was lost when switching the errand'
ui.capture('03-form-queue')

relaunch(ui)
open_sheet(ui)
ui.element('bounty-post-form')
assert value(ui, 'bounty-post-title') == TITLE_SHOWN, 'the kept draft did not open in the form'
ui.tap('BackButton')
ui.element('bounty-post-pick')
ui.tap('bounty-post-pick-queue')
ui.element('bounty-post-form')
form_scroll_to(ui, 'bounty-post-clear')
ui.tap('bounty-post-clear')
tap_sheet_action(ui, ui.t('bounty.post.form.clearConfirm.confirm'), 'bounty-post-clear')
ui.element('bounty-post-pick')
ui.gone('bounty-post-form')
ui.capture('04-cleared')
print('PASS: tiles set the errand and its hints, back keeps the title, a kept draft opens the form, 清空草稿 returns')
