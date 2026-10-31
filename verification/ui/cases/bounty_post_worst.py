"""Worst-case data on the form and confirm: a 60-code-point title wraps without hiding RM 500, the 500-code-point
description counts 500/500, two 40-character unpaid names with RM 12,345.60 read in full in the notice, and the pinned
buttons stay 44 pt above the home indicator in both scroll positions. A relaunch with the RM 1 draft without optional
rows shows RM 1 and no summary rows."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import assert_preview, close_sheet_by_swipe, dismiss_hint, next_step, open_post, relaunch  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'worst', '-uiVerifyUnpaid', 'two',
        '-uiVerifyFixture', 'worst']
BUDGET = 300
NAMES = ['Wan Nurul Aisyah binti Wan Abdul Rahman', '陈美玲 (Tan Mei Ling) · Sunway Geo Residence']
HOME_INDICATOR = 34
CARD_INSET = 16
WORST_TITLE = '帮忙从 Mid Valley Megamall'

ui = UI(*sys.argv[1:])


def scroll(identifier, down):
    f = ui.element(identifier)['frame']
    x = f['x'] + f['width'] / 2
    top, bottom = f['y'] + f['height'] * 0.3, f['y'] + f['height'] * 0.75
    ui.swipe((x, bottom), (x, top), 0.4) if down else ui.swipe((x, top), (x, bottom), 0.4)


def assert_actions(identifiers):
    items = ui.read()
    screen = items[0]['frame']['height']
    for identifier in identifiers:
        button = by_id(items, identifier)
        assert button, f'{identifier} is missing'
        assert_touch_target(button, identifier)
        bottom = button['frame']['y'] + button['frame']['height']
        assert bottom <= screen - HOME_INDICATOR, f'{identifier} reaches into the home indicator: {button["frame"]}'


def assert_card(title, amount, wraps):
    text, reward = assert_preview(ui, title, amount)
    t, r = text['frame'], reward['frame']
    screen = ui.read()[0]['frame']['width']
    assert r['x'] >= t['x'] + t['width'] - 1, f'the title runs under the reward: {t} / {r}'
    assert r['x'] + r['width'] <= screen - CARD_INSET, f'RM {amount} is cut off at the card edge: {r}'
    if wraps:
        assert t['height'] >= 2 * r['height'], f'the long title did not wrap: {t}'


open_post(ui)
dismiss_hint(ui)
ui.wait_label('bounty-post-title-count', lambda label: label == ui.t('bounty.post.form.countLabel', count=60, max=60),
              'title counter is not 60/60')
ui.capture('01-form-top')
scroll('bounty-post-form', True)
ui.wait_label('bounty-post-description-count',
              lambda label: label == ui.t('bounty.post.form.countLabel', count=500, max=500), 'description is not 500/500')
scroll('bounty-post-form', True)
ui.capture('02-form-bottom')
next_step(ui)
ui.element('bounty-post-confirm')
assert_card(WORST_TITLE, '500', wraps=True)
assert_actions(['bounty-post-pay', 'bounty-post-publish'])
ui.capture('03-confirm-top')
scroll('bounty-post-confirm', True)
notice = ui.element('bounty-post-blocked').get('AXLabel') or ''
for name in NAMES:
    assert name in notice, f'{name} missing from the notice: {notice!r}'
assert len(re.findall(r'RM\s?12,345\.60', notice)) == 2, f'the notice does not show RM 12,345.60 twice: {notice!r}'
assert_actions(['bounty-post-pay', 'bounty-post-publish'])
ui.capture('04-confirm-bottom')

ui.tap('BackButton')
close_sheet_by_swipe(ui)
relaunch(ui, drop=['-uiVerifyBountyDraft', 'worst', '-uiVerifyUnpaid', 'two'], add=['-uiVerifyBountyDraft', 'one'])
open_post(ui)
next_step(ui)
ui.element('bounty-post-confirm')
assert_card('借伞', '1', wraps=False)
items = ui.read()
assert by_id(items, 'bounty-post-time') is None and by_id(items, 'bounty-post-summary-description') is None, \
    'summary rows shown for a draft without optional rows'
assert_actions(['bounty-post-publish'])
ui.capture('05-confirm-one')
print('PASS: worst and RM 1 drafts fit the form and confirm')
