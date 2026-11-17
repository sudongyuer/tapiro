"""Apply without a payee method (36A): with no payee methods the apply sheet shows an inline card (小貘's head, 先加一个收款方式 and the body naming 小林) and 添加收款方式 as the accent pill pinned at the bottom, at least 44 pt, no note field and no 发送; 添加收款方式 closes the sheet and opens 收款方式 pushed in the 我的 stack (back button 我的)."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from apply import open_from_card, send_button, title_shown  # noqa: E402
from board import screen  # noqa: E402
from driver import UI, assert_touch_target, by_id, close, reach_home, token  # noqa: E402
from ocr import find, lines_in  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-apply/', 'src/app/(tabs)/', 'verification/ui/board.py',
        'verification/ui/apply.py', 'src/features/place/', 'src/features/block/', 'src/ui/InlineState.tsx',
        'src/ui/PillButton.tsx', 'src/ui/SheetFrame.tsx', 'modules/tapiro-kit/', 'verification/ui/ocr.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyFixture', 'empty']
CARD = 'bounty-card-fixture-bounty-01'
FILL_SHARE = 0.6
CARD_PAD = 16
TAIL = 3

ui = UI(*sys.argv[1:])

reach_home(ui)
open_from_card(ui, CARD, ready='bounty-apply-no-payee')
block = ui.settled(lambda items: by_id(items, 'bounty-apply-no-payee'), 'the no-payee block never settled')
text = block.get('AXLabel') or ''
for expected in (ui.t('bounty.apply.noPayee.title'), ui.t('bounty.apply.noPayee.body', name='小林')):
    assert expected in text, f'the no-payee block reads {text!r}, expected {expected!r}'
items = ui.read()
assert by_id(items, 'bounty-apply-note') is None, 'the no-payee sheet still shows the note field'
assert send_button(ui, items) is None, 'the no-payee sheet still offers 发送'
add = ui.element('bounty-apply-add-payee')
assert add.get('AXLabel') == ui.t('bounty.apply.noPayee.add'), add.get('AXLabel')
assert_touch_target(add, ui.t('bounty.apply.noPayee.add'))
ui.at_rest()
shot = ui.snap('01-no-payee')
items = ui.read()
add, block, height = by_id(items, 'bounty-apply-add-payee')['frame'], by_id(items, 'bounty-apply-no-payee')['frame'], \
    screen(items)['height']
assert add['y'] > height * 0.75 and add['y'] > block['y'] + block['height'], \
    f'添加收款方式 is not pinned at the bottom under the card: {add}, card {block}, screen {height}'
body = re.sub(r'\W+$', '', ui.t('bounty.apply.noPayee.body', name='小林'))
card = {'x': block['x'] - CARD_PAD, 'y': block['y'] - CARD_PAD, 'width': block['width'] + 2 * CARD_PAD,
        'height': block['height'] + 2 * CARD_PAD}
assert card['x'] + card['width'] <= screen(items)['width'], f'the no-payee card runs past the screen: {card}'
assert find(lines_in(shot, ui.locale), re.escape(body[-TAIL:]), card), \
    f'the no-payee body is cut: its end {body[-TAIL:]!r} is not read inside the card {card}'
accent = token('--color-accent', ui.appearance)
kept = shot.count(add, lambda rgb: close(rgb, accent, 12)) / (add['width'] * add['height'] * shot.scale ** 2)
assert kept >= FILL_SHARE, f'添加收款方式 is not the accent pill ({kept:.2f} of its frame is the accent)'

ui.tap('bounty-apply-add-payee')
ui.gone('bounty-apply')
ui.element('payee-screen')
title_shown(ui, 'payee.title')
back = by_id(ui.read(), 'BackButton')
assert back and back.get('AXLabel') == ui.t('shell.tabs.me'), f'收款方式 is not pushed in 我的: {back}'
ui.at_rest()
ui.capture('02-payee')
