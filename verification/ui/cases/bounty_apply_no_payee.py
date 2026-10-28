"""Apply without a payee method (36A): with no payee methods the apply sheet shows 先加一个收款方式 with the body naming 小林 and 添加收款方式, no note field and no 发送; 添加收款方式 closes the sheet and opens 收款方式 pushed in the 我的 stack (back button 我的)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from apply import open_from_card, send_button, title_shown  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-apply/', 'src/app/(tabs)/', 'verification/ui/board.py',
        'verification/ui/apply.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyFixture', 'empty']
CARD = 'bounty-card-fixture-bounty-01'

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
ui.at_rest()
ui.capture('01-no-payee')

ui.tap('bounty-apply-add-payee')
ui.gone('bounty-apply')
ui.element('payee-screen')
title_shown(ui, 'payee.title')
back = by_id(ui.read(), 'BackButton')
assert back and back.get('AXLabel') == ui.t('shell.tabs.me'), f'收款方式 is not pushed in 我的: {back}'
ui.at_rest()
ui.capture('02-payee')
