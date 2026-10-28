"""Apply 4A from a board card: 申请 opens the full-height sheet titled 申请帮忙 with the note field, a 0/140 counter and the footer naming 小林; typing a note updates the counter by code points; 发送 turns into progress while the request runs, the sheet closes, and the card shows 已申请 · 等对方选 with the 已申请 stamp and no 申请 (the stamp motion is in the video); the detail then reads 已申请 · 等小林选 and 你写的：<note>."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from apply import count_reads, has_stamp, open_from_card, send, send_button, type_note  # noqa: E402
from board import apply_pill  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-apply/', 'src/app/(tabs)/bounty/', 'verification/ui/board.py',
        'verification/ui/apply.py']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']
CARD = 'bounty-card-fixture-bounty-01'
NOTE = 'see you at the lobby'

ui = UI(*sys.argv[1:])

reach_home(ui)
open_from_card(ui, CARD)
count_reads(ui, 0)
ui.labelled(ui.t('bounty.apply.footerSeen', name='小林'))
ui.labelled(ui.t('bounty.apply.footerWithdraw'))
shown = type_note(ui, NOTE)
count_reads(ui, len(NOTE))
ui.at_rest()
ui.capture('01-sheet')

send(ui)
ui.element('bounty-apply-sending', timeout=5)
assert send_button(ui, ui.read()) is None, '发送 is still offered while the request runs'
ui.gone('bounty-apply')

applied_label = ui.t('bounty.board.card.applied')
card = ui.wait(lambda items: (lambda c: c if c and applied_label in (c.get('AXLabel') or '') else None)(by_id(items, CARD)),
               'the card never reads 已申请')
ui.at_rest()
shot = ui.snap('02-card-applied')
assert has_stamp(ui, shot, card['frame']), 'the card shows no 已申请 stamp after applying'
pill = apply_pill(shot, card, ui.appearance)
assert pill is None or pill['height'] < 20, f'the applied card still shows 申请: {pill}'

f = card['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
ui.element('bounty-detail-title')
applied = ui.settled(lambda items: by_id(items, 'bounty-detail-applied'), 'the detail never shows 已申请')
assert applied.get('AXLabel') == ui.t('bounty.detail.applied', name='小林'), applied.get('AXLabel')
note = ui.settled(lambda items: by_id(items, 'bounty-detail-note'), 'the detail does not show the note')
assert note.get('AXLabel') == ui.t('bounty.detail.yourNote', note=shown), note.get('AXLabel')
assert by_id(ui.read(), 'bounty-detail-apply') is None, 'the detail still offers 申请'
ui.at_rest()
ui.capture('03-detail-applied')
