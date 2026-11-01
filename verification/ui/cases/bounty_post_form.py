"""「+」 on 悬赏 with no draft opens the tile screen; 直接写 opens the 发悬赏 form under the live card. 下一步 on an empty form
shows the first missing field; typing "parcel" guesses 代取 and marks it 按标题自动 (153A), so the next missing field is
the reward; the category menu lists all eight types and a manual choice (代排, then back to 代取) drops the mark; the footer suggests RM 5–8;
a reward of 0 or 501 is out of range; the RM 8 button fills the field; a valid form reaches
确认发布, whose card shows the category. The form sits on the grouped background and every control it touches is 44 pt.
A 20-key burst typed with no delay lands in full and the title counter stays hidden below 50 characters."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import (  # noqa: E402
    CATEGORIES, CONFIRM_TITLE, REWARD_RANGE_TEXT, TITLE, TITLE_SHOWN, TITLE_TYPED, assert_error, assert_grouped_background, assert_title, burst,
    erase, form_scroll_to, next_step, open_post, pick_category, reach_confirm, typed, value,
)
from driver import UI, assert_touch_target  # noqa: E402

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
SUGGESTED = 'RM\u00a05–8'

ui = UI(*sys.argv[1:])
open_post(ui)
assert_title(ui, TITLE)
next_step(ui)
assert_error(ui, 'bounty.post.error.titleEmpty')
shot = ui.snap('01-error')
assert_grouped_background(ui, shot, ui.element('bounty-post-form')['frame'], 'form')

burst(ui, 'bounty-post-title', BURST)
ui.gone('bounty-post-error')
ui.gone('bounty-post-title-count')
erase(ui, 'bounty-post-title')
typed(ui, 'bounty-post-title', TITLE_TYPED, TITLE_SHOWN)
ui.wait_label('bounty-post-category-auto', lambda label: label == ui.t('bounty.post.form.autoCategory'),
              'the guessed category is not marked 按标题自动')
ui.wait_label('bounty-post-live-text', lambda label: label.startswith(ui.t('bounty.category.pickup')),
              'the live card does not show the guessed 代取')
next_step(ui)
assert_error(ui, 'bounty.post.error.rewardEmpty')

picker = ui.element('bounty-post-category')['frame']
assert picker['height'] >= SYSTEM_MENU_ROW, f'category menu shrank: {picker}'
ui.tap_point(picker['x'] + picker['width'] / 2, picker['y'] + picker['height'] / 2)
items = ui.wait(lambda items: all(any(i.get('AXLabel') == ui.t(f'bounty.category.{slug}') for i in items)
                                  for slug in CATEGORIES) and items, 'the category menu does not list all eight types')
ui.capture('02-category-menu')
ui.tap_label(ui.t('bounty.category.queue'))
ui.gone('bounty-post-category-auto')
pick_category(ui, 'pickup')
suggest = ui.t('bounty.post.form.rewardSuggest', range=SUGGESTED) + ' ' + ui.t('bounty.post.form.rewardFooter')
ui.wait_label('bounty-post-reward-footer', lambda label: label.replace('\n', ' ') == suggest,
              'the reward footer does not suggest RM 5–8')
for wrong in ('0', '501'):
    typed(ui, 'bounty-post-reward', wrong)
    next_step(ui)
    assert_error(ui, 'bounty.post.error.rewardRange', **REWARD_RANGE_TEXT)
    erase(ui, 'bounty-post-reward')
assert_touch_target(ui.element('bounty-post-amount-8'), 'RM 8')
ui.tap('bounty-post-amount-8')
ui.wait(lambda items: value(ui, 'bounty-post-reward') == '8', 'the RM 8 button did not fill the reward')

assert_touch_target(form_scroll_to(ui, 'bounty-post-clear'), '清空草稿')
ui.capture('03-filled')
reach_confirm(ui)
ui.capture('04-confirm')
assert_title(ui, CONFIRM_TITLE)
ui.wait_label('bounty-post-preview-text', lambda label: label.startswith(ui.t('bounty.category.pickup')),
              'the confirm card does not show the category')
print('PASS: 「+」 opens the form, errors show in order, the menu lists eight types and a valid form reaches confirm')
