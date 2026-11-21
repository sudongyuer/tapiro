"""Apply from the detail: 申请 in the detail opens the sheet, 发送 closes it and the stamp lands on the detail, which reads 已申请 · 等Aisyah选; back on the board the card shows the stamp at rest. Without a payee method, 添加收款方式 opens 收款方式 over the apply sheet (audit batch A), and closing it returns to the apply sheet."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from apply import STAMP_MIN, has_stamp, send, title_shown  # noqa: E402
from board import ink_box, screen, visible  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, reach_home, token  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-apply/', 'src/app/(tabs)/', 'verification/ui/board.py',
        'verification/ui/apply.py', 'verification/ui/bounty.py', 'src/features/place/', 'src/features/block/']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']
CARD = 'bounty-card-fixture-bounty-02'

ui = UI(*sys.argv[1:])


def open_detail():
    card = visible(ui, CARD)
    ui.at_rest()
    f = card['frame']
    ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
    ui.element('bounty-detail-title')
    ui.wait(lambda items: (by_id(items, 'bounty-detail-apply') or {}).get('enabled')
            and (by_id(items, 'bounty-detail-apply') or {}).get('AXLabel') == ui.t('bounty.detail.apply'),
            '申请 in the detail never became ready')
    ui.tap('bounty-detail-apply')
    title_shown(ui, 'bounty.apply.title')


reach_home(ui)
open_detail()
ui.element('bounty-apply-note')
send(ui)
ui.gone('bounty-apply')
applied = ui.settled(lambda items: by_id(items, 'bounty-detail-applied'), 'the detail never shows 已申请')
assert applied.get('AXLabel') == ui.t('bounty.detail.applied', name='Aisyah'), applied.get('AXLabel')
ui.element('bounty-detail-stamp')
ui.at_rest()
items = ui.read()
title = by_id(items, 'bounty-detail-title')['frame']
band = {'x': 0, 'y': title['y'] - 90, 'width': screen(items)['width'], 'height': 90}
ink = ink_box(ui.snap('01-detail-stamped'), band, token('--color-paper-green', ui.appearance), 40)
assert ink and ink['count'] >= STAMP_MIN, f'the detail shows no 已申请 stamp: {ink}'

ui.tap('BackButton')
ui.gone('bounty-detail-title')
applied_label = ui.t('bounty.board.card.applied')
card = ui.wait(lambda items: (lambda c: c if c and applied_label in (c.get('AXLabel') or '') else None)(by_id(items, CARD)),
               'the card never reads 已申请')
ui.at_rest()
assert has_stamp(ui, ui.snap('02-card'), card['frame']), 'the card shows no stamp after applying from the detail'

relaunch(ui, drop=[], add=['-uiVerifyFixture', 'empty'])
open_detail()
ui.element('bounty-apply-no-payee')
ui.tap('bounty-apply-add-payee')
ui.element('payee-screen')
title_shown(ui, 'payee.title')
assert by_id(ui.read(), 'BackButton') is None, '收款方式 was pushed in a tab instead of opening over the apply sheet'
assert not by_id(ui.read(), 'tab-me') or str(by_id(ui.read(), 'tab-me').get('AXValue')) != '1', 'the payee detour switched to 我的'
ui.at_rest()
ui.capture('03-payee-over-apply')
closes = [i for i in ui.read() if i.get('type') == 'Button' and i.get('AXLabel') == ui.t('payee.close')]
assert closes, 'the payee sheet has no close button'
top = max(closes, key=lambda i: i['frame']['y'])['frame']
ui.tap_point(top['x'] + top['width'] / 2, top['y'] + top['height'] / 2)
ui.gone('payee-screen')
ui.element('bounty-apply-add-payee')
ui.at_rest()
ui.capture('04-back-on-apply')
print('PASS: applying from the detail stamps it and the card; without a payee method the payee sheet opens over the apply sheet and closes back to it')
