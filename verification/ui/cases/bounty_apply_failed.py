"""Apply failures: a send that fails shows 没发出去，再试一次 with the typed note still in the field and 发送 enabled, nothing is resent by itself, and the second 发送 succeeds and marks the card 已申请; a bounty taken meanwhile shows its reason and 发送 disabled, and the sheet stays open."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from apply import note_value, open_from_card, send, send_button, type_note  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-apply/', 'src/app/(tabs)/bounty/', 'verification/ui/board.py',
        'verification/ui/apply.py', 'verification/ui/bounty.py']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyApply', 'failOnce']
CARD = 'bounty-card-fixture-bounty-01'
NOTE = 'i can go now'
QUIET_S = 3

ui = UI(*sys.argv[1:])


def notice_reads(key):
    expected = ui.t(key)
    ui.wait(lambda items: expected in ((by_id(items, 'bounty-apply-failed') or {}).get('AXLabel') or ''),
            f'the sheet does not show {expected!r}')


reach_home(ui)
open_from_card(ui, CARD)
shown = type_note(ui, NOTE)
send(ui)
notice_reads('bounty.apply.failed')
items = ui.read()
assert note_value(items) == shown, f'the note reads {note_value(items)!r} after the failure, expected {shown!r}'
assert by_id(items, 'bounty-apply-sending') is None, 'progress is still shown after the failure'
time.sleep(QUIET_S)  # a resend would have answered within this window
items = ui.read()
assert by_id(items, 'bounty-apply-failed'), 'the failure notice went away by itself: the send was replayed'
assert (send_button(ui, items) or {}).get('enabled'), '发送 is not enabled after a failure'
ui.at_rest()
ui.capture('01-failed')

send(ui)
ui.gone('bounty-apply')
applied = ui.t('bounty.board.card.applied')
ui.wait(lambda items: applied in ((by_id(items, CARD) or {}).get('AXLabel') or ''), 'the card never reads 已申请')

relaunch(ui, drop=['-uiVerifyApply', 'failOnce'], add=['-uiVerifyApply', 'taken'])
open_from_card(ui, CARD)
send(ui)
notice_reads('bounty.apply.taken')
button = ui.settled(lambda items: send_button(ui, items), '发送 never settled after taken')
assert not button.get('enabled'), '发送 is still enabled for a taken bounty'
assert by_id(ui.read(), 'bounty-apply'), 'the sheet closed on taken'
ui.at_rest()
ui.capture('02-taken')
