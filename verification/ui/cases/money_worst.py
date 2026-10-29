"""Worst-case money (break-ui, 64A–67A) with ¥800, the CNY limit, and 39- to 40-character names. Post form: the ¥800
draft with a 60-code-point title keeps the 「¥ 人民币」 pull-down and 800 on one row inside the screen, the footer reads
「¥1–800」, and the confirm card shows ¥800 beside the wrapped title. Detail (worst board, ¥800 bounty): 约 RM 489.80 on
its own line below ¥800. Status (poster, marked paid): ¥800 with the locked 约 RM 489.76. Pay sheet, payer, ¥800 to Wan
Nurul Aisyah binti Wan Abdul Rahman at an 8-digit locked rate (0.61224567): the DuitNow row shows RM 489.80 and the
footer rounds the rate to ¥1 = RM 0.6122. Without a rate the ringgit rows say they cannot convert; with only DuitNow and
no rate the card names the payee in full. Every amount sits inside the screen; ms runs the longest copy."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import CNY_RANGE_TEXT, assert_preview, next_step, open_post, relaunch  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from pay import find, open_sheet, scroll_to  # noqa: E402

DEPS = ['src/features/bounty/', 'src/features/payment/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/',
        'src/app/pay/', 'src/lib/money.ts', 'verification/ui/bounty.py', 'verification/ui/pay.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'worstCny', '-uiVerifyPostCost', 'free']
BUDGET = 420
TITLE = '帮忙从 Mid Valley Megamall'
PAYEE = 'Wan Nurul Aisyah binti Wan Abdul Rahman'
EDGE = 16

ui = UI(*sys.argv[1:])


def screen_width(items):
    return items[0]['frame']['width']


def assert_inside(items, identifier, name):
    element = by_id(items, identifier)
    assert element, f'{name} is missing'
    f = element['frame']
    assert f['x'] >= 0 and f['x'] + f['width'] <= screen_width(items) - EDGE + 1, f'{name} leaves the screen: {f}'
    return element


def assert_below(items, prefix, amount):
    reward = assert_inside(items, f'{prefix}-reward', f'{prefix} amount')
    reference = assert_inside(items, f'{prefix}-reference', f'{prefix} 约 line')
    assert reference.get('AXLabel') == ui.t('bounty.reference', amount=amount), reference.get('AXLabel')
    r, f = reward['frame'], reference['frame']
    assert f['y'] >= r['y'] + r['height'] - 1, f'the 约 line {f} is not below the amount {r}'


open_post(ui)
items = ui.wait(lambda items: items if by_id(items, 'bounty-post-currency') else None,
               'the currency pull-down never showed')
expected = ui.t('bounty.post.form.currencyItem', symbol='¥', name=ui.t('bounty.post.form.currencyName.CNY'))
assert by_id(items, 'bounty-post-currency').get('AXValue') == expected, by_id(items, 'bounty-post-currency')
assert_touch_target(by_id(items, 'bounty-post-currency'), 'currency pull-down')
pull_down = assert_inside(items, 'bounty-post-currency', 'currency pull-down')['frame']
field = assert_inside(items, 'bounty-post-reward', 'reward field')['frame']
assert abs((field['y'] + field['height'] / 2) - (pull_down['y'] + pull_down['height'] / 2)) <= 12, \
    f'the pull-down {pull_down} and the amount {field} are not on one row'
assert (by_id(items, 'bounty-post-reward').get('AXValue') or '') == '800', by_id(items, 'bounty-post-reward')
ui.wait_label('bounty-post-reward-footer', lambda label: label == ui.t('bounty.post.form.rewardFooter', **CNY_RANGE_TEXT),
              'the footer does not read ¥1–800')
ui.capture('01-form-cny-800')
next_step(ui)
ui.element('bounty-post-confirm')
text, reward = assert_preview(ui, TITLE, '800', symbol='¥')
t, r = text['frame'], reward['frame']
assert r['x'] >= t['x'] + t['width'] - 1, f'the title runs under ¥800: {t} / {r}'
assert r['x'] + r['width'] <= screen_width(ui.read()) - EDGE, f'¥800 is cut off at the card edge: {r}'
ui.capture('02-confirm-cny-800')

home = ['-uiVerifyBountyDraft', 'worstCny', '-uiVerifyPostCost', 'free']
relaunch(ui, drop=home, add=['-uiVerifyScene', 'bounty-detail', '-uiVerifyBoard', 'worst',
                             '-uiVerifyDetailId', 'fixture-worst-03'], ready='bounty-detail-place')
assert_below(ui.read(), 'bounty-detail', 'RM 489.80')
ui.at_rest()
ui.capture('03-detail')

relaunch(ui, drop=home, add=['-uiVerifyScene', 'bounty-status', '-uiVerifyBountyStatusData', 'worstCny',
                             '-uiVerifyBountyRole', 'poster', '-uiVerifyBountyStatus', 'markedPaid'],
         ready='bounty-status-step-payment')
assert_below(ui.read(), 'bounty-status', 'RM 489.76')
ui.at_rest()
ui.capture('04-status-paid')

pay = ['-uiVerifyScene', 'pay-sheet', '-uiVerifyFixture', 'worst', '-uiVerifyPayCurrency', 'CNY']
relaunch(ui, drop=home, add=pay, ready='pay-amount')
amount = open_sheet(ui)
assert re.search(r'¥\s?800\.00', amount.get('AXLabel') or ''), amount.get('AXLabel')
items = ui.read()
rows = {(i.get('AXUniqueId') or '').split('-')[2]: i for i in find(items, 'pay-method-')}
phone = rows.get('duitnow_id')
assert phone and re.search(r'RM\s?489\.80', phone.get('AXLabel') or ''), phone
for row in rows.values():
    assert_inside(items, row['AXUniqueId'], f'{row["AXUniqueId"]} row')
ui.capture('05-pay-converted')
ui.tap(phone['AXUniqueId'])
footer = scroll_to(ui, 'pay-rate-footer')
rate = '¥1\u00a0=\u00a0RM\u00a00\\.6122'
assert re.search(ui.pattern('pay.sheet.rateFooter', date=r'.+', rate=rate), footer.get('AXLabel') or ''), \
    footer.get('AXLabel')
assert_inside(ui.read(), 'pay-rate-footer', 'rate footer')
ui.capture('06-pay-rate-footer')

relaunch(ui, drop=home, add=[*pay, '-uiVerifyFx', 'none'], ready='pay-amount')
items = ui.read()
phone = next(i for i in find(items, 'pay-method-') if (i.get('AXUniqueId') or '').startswith('pay-method-duitnow_id'))
reason = ui.t('pay.sheet.noRate', currency='RM')
label = phone.get('AXLabel') or ''
assert reason in label and phone.get('enabled') is False, f'DuitNow without a rate: {phone}'
assert_inside(items, phone['AXUniqueId'], 'DuitNow row without a rate')
ui.capture('07-pay-no-rate')

relaunch(ui, drop=home, add=[*pay, '-uiVerifyFx', 'none', '-uiVerifyPayMethods', 'duitnow'], ready='pay-no-methods')
card = assert_inside(ui.read(), 'pay-no-methods', 'no-method card')
title = ui.t('pay.sheet.noCurrency', name=PAYEE, currency=ui.t('pay.sheet.currencyName.CNY'))
assert title in (card.get('AXLabel') or ''), card.get('AXLabel')
ui.capture('08-pay-no-method')
print('PASS: ¥800 and long names fit the post form, detail, status and pay sheet, with and without a rate')
