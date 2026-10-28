"""Choosing fails (51A): with -uiVerifySelect failOnce a hold kept down through the send shows 没发出去，再试一次 above the
button, 阿杰 stays chosen, nothing is recorded as selected and releasing does not send again; a second hold then
chooses 阿杰. notPending shows its notice and the reloaded list without 阿杰, with no one chosen; noPayee keeps 阿杰
chosen under its notice; closed shows the closed card with 返回, no button and no live status line. Each answer
comes from exactly one select call: nothing is replayed. Screenshots per answer."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from choose import (  # noqa: E402
    HOLD, JIE, assert_attempts, assert_none_selected, assert_one_selected, choose, hold_reads, hold_select, row_id,
    write_delay_s,
)
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/bounty/select/', 'src/ui/HoldButton.tsx', 'src/app/(tabs)/bounty/', 'verification/ui/choose.py']
SCENE = 'bounty-applicants'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifySelect', 'failOnce']
BUDGET = 420
THROUGH_SEND_S = 1.0 + write_delay_s() + 1.5

ui = UI(*sys.argv[1:])
label = ui.t('bounty.select.hold.label', name='阿杰')


def notice(key):
    expected = ui.t(key)
    return ui.wait_label('bounty-select-failed', lambda text: text == expected, f'the notice does not read {expected!r}')


def restart(mode):
    relaunch(ui, drop=['-uiVerifySelect', 'failOnce'], add=['-uiVerifyScene', SCENE, '-uiVerifySelect', mode],
             ready=row_id(JIE))
    choose(ui, JIE, '阿杰')
    hold_select(ui)


choose(ui, JIE, '阿杰')
hold_select(ui, THROUGH_SEND_S)
notice('bounty.select.failure.failed')
hold_reads(ui, label)
assert by_id(ui.read(), row_id(JIE)), '阿杰 left the list after a failed send'
assert by_id(ui.read(), 'bounty-select-done') is None, 'a failed send shows the after-choosing state'
assert_none_selected(ui, 'a failed send held past its answer')
assert_attempts(ui, 1)
ui.at_rest()
ui.capture('01-failed')

hold_select(ui)
ui.wait_label('bounty-select-done', lambda text: text == ui.t('bounty.select.done.title', name='阿杰'),
              'the second hold did not choose 阿杰')
ui.gone('bounty-select-failed')
assert_one_selected(ui, JIE)
assert_attempts(ui, 2)
ui.at_rest()
ui.capture('02-second-hold')

restart('notPending')
notice('bounty.select.failure.notPending')
ui.gone(row_id(JIE))
hold_reads(ui, ui.t('bounty.select.hold.none'))
status = ui.element('bounty-applicants-status').get('AXLabel')
assert status == ui.tn('bounty.select.statusOpen', 2), f'the reloaded list reads {status!r}'
assert_attempts(ui, 1)
ui.at_rest()
ui.capture('03-not-pending')

restart('noPayee')
notice('bounty.select.failure.noPayee')
hold_reads(ui, label)
assert_attempts(ui, 1)
ui.at_rest()
ui.capture('04-no-payee')

restart('closed')
closed = ui.wait_label('bounty-applicants-closed', lambda text: ui.t('bounty.select.closed') in text,
                       'the closed state is not shown')
items = ui.read()
for absent in (HOLD, row_id(JIE), 'bounty-select-failed', 'bounty-applicants-status'):
    assert by_id(items, absent) is None, f'the closed state still shows {absent}'
ui.element('bounty-applicants-back')
assert_attempts(ui, 1)
ui.at_rest()
ui.capture('05-closed')
print('PASS: failed keeps 阿杰 and sends once on the next hold; notPending reloads; noPayee keeps the choice; closed')
