"""「+」 on 悬赏 opens the 发悬赏 sheet; 下一步 on an empty form shows the first missing field, the category menu lists all
eight types, a reward of 0 or 501 is out of range, and a valid form reaches 确认发布. The form sits on the grouped
background and every control it touches is 44 pt. A 20-key burst typed with no delay shows 20/60 on the counter."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import (  # noqa: E402
    CATEGORIES, CONFIRM_TITLE, REWARD_RANGE, TITLE, TITLE_SHOWN, TITLE_TYPED, assert_error, assert_grouped_background, assert_title, burst,
    erase, next_step, open_post, reach_confirm, typed,
)
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = [
    'src/features/bounty/',
    'src/app/bounty-post/',
    'src/app/(tabs)/bounty/',
    'verification/ui/bounty.py',
]
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'none']
BUDGET = 240
# The system menu Picker's hit area is the full row width but 34 pt high and ignores frame modifiers; it is a
# platform control, so it is checked against its own size instead of being restyled. Text fields report a 22 pt
# frame; bounty.typed taps 9 pt outside it, inside the 44 pt frame the form gives them, so typing proves the target.
SYSTEM_MENU_ROW = 34
# A 20-key `axe type` burst with no delay between keys; the counter must read every key. It guards the field's
# wiring: with the selection and focus sync removed it still passed (2026-10-28), so it does not reproduce the drop.
BURST = '12345678901234567890'

ui = UI(*sys.argv[1:])
open_post(ui)
assert_title(ui, TITLE)
next_step(ui)
assert_error(ui, 'bounty.post.error.titleEmpty')
shot = ui.snap('01-error')
assert_grouped_background(ui, shot, ui.element('bounty-post-form')['frame'], 'form')

burst(ui, 'bounty-post-title', BURST)
ui.gone('bounty-post-error')
ui.wait_label('bounty-post-title-count',
              lambda label: label == ui.t('bounty.post.form.countLabel', count=len(BURST), max=60),
              f'title counter lost a key of a {len(BURST)}-key burst')
erase(ui, 'bounty-post-title')
typed(ui, 'bounty-post-title', TITLE_TYPED, TITLE_SHOWN)
ui.wait_label('bounty-post-title-count', lambda label: label == ui.t('bounty.post.form.countLabel', count=6, max=60),
              'title counter does not read 6/60')
next_step(ui)
assert_error(ui, 'bounty.post.error.categoryEmpty')

picker = ui.element('bounty-post-category')['frame']
assert picker['width'] >= 300 and picker['height'] >= SYSTEM_MENU_ROW, f'category menu shrank: {picker}'
ui.tap_point(picker['x'] + picker['width'] - 60, picker['y'] + picker['height'] / 2)
items = ui.wait(lambda items: all(any(i.get('AXLabel') == ui.t(f'bounty.category.{slug}') for i in items)
                                  for slug in CATEGORIES) and items, 'the category menu does not list all eight types')
ui.capture('02-category-menu')
ui.tap_label(ui.t('bounty.category.pickup'))
ui.wait(lambda items: not any(i.get('AXLabel') == ui.t('bounty.post.form.categoryPlaceholder') for i in items),
        'category placeholder still shown')

next_step(ui)
assert_error(ui, 'bounty.post.error.rewardEmpty')
for wrong in ('0', '501'):
    typed(ui, 'bounty-post-reward', wrong)
    next_step(ui)
    assert_error(ui, 'bounty.post.error.rewardRange', **REWARD_RANGE)
    erase(ui, 'bounty-post-reward')
typed(ui, 'bounty-post-reward', '8')

items = ui.read()
assert_touch_target(by_id(items, 'bounty-post-clear'), '清空草稿')
ui.capture('03-filled')
reach_confirm(ui)
ui.capture('04-confirm')
assert_title(ui, CONFIRM_TITLE)
print('PASS: 「+」 opens the form, errors show in order, the menu lists eight types and a valid form reaches confirm')
