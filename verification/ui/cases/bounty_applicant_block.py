"""Block from the applicant list (5A): long-pressing Hana's row offers a destructive 屏蔽Hana; the action sheet 屏蔽Hana？
states that Hana's application disappears too; 屏蔽 shows progress on Hana's row, the first call fails
(`-uiVerifyBlock failOnce`) and the row stays with 没屏蔽成功; the second removes Hana and the hint counts the other 1.
With Aiman chosen, blocking Aiman clears the check and the button returns to 先选一个人, disabled. 我的 → 屏蔽名单
lists Aiman and Hana."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import tap_sheet_action  # noqa: E402
from choose import AIMAN, HANA, HOLD, JIE, hold_reads, row_id  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/bounty/select/', 'src/features/bounty/shared/', 'src/features/bounty/board/', 'src/ui/TierMark.tsx', 'src/features/bounty/block/', 'src/ui/HoldButton.tsx',
        'src/app/(tabs)/bounty/', 'verification/ui/choose.py', 'verification/ui/bounty.py']
SCENE = 'bounty-applicants'
BUDGET = 360
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBlock', 'failOnce', '-uiVerifyBlockDelayMs', '6000']
LONG_PRESS_S = 1.2
TITLE = 'bounty-applicants-title'

ui = UI(*sys.argv[1:])


def menu_for(applicant, name):
    ui.settled(lambda items: by_id(items, row_id(applicant)), f'{name} row never settled')
    ui.press(row_id(applicant), LONG_PRESS_S)
    return ui.labelled(ui.t('bounty.block.menu', name=name))


def confirm_block(applicant, name):
    menu_for(applicant, name)
    ui.tap_label(ui.t('bounty.block.menu', name=name))
    ui.labelled(ui.t('bounty.block.confirm.title', name=name))
    ui.labelled(ui.t('bounty.block.confirm.applicantBody', name=name))
    tap_sheet_action(ui, ui.t('bounty.block.confirm.confirm'), TITLE)
    blocking(applicant)


def blocking(applicant):
    busy = ui.element(f'bounty-applicant-blocking-{applicant}', timeout=5)
    assert busy.get('AXLabel') == ui.t('bounty.block.blocking'), busy.get('AXLabel')
    return busy


def hint_reads(count):
    expected = ui.tn('bounty.select.hold.hint', count)
    return ui.wait_label(f'{HOLD}-hint', lambda text: text == expected, f'the hint does not read {expected!r}')


ui.settled(lambda items: by_id(items, row_id(AIMAN)), 'the applicant rows never settled')
hold_reads(ui, ui.t('bounty.select.hold.none'))
hint_reads(2)

menu_for(HANA, 'Hana')
ui.at_rest()
ui.capture('01-menu')
ui.tap_label(ui.t('bounty.block.menu', name='Hana'))
ui.labelled(ui.t('bounty.block.confirm.title', name='Hana'))
ui.labelled(ui.t('bounty.block.confirm.applicantBody', name='Hana'))
ui.at_rest()
ui.capture('02-confirm')
tap_sheet_action(ui, ui.t('bounty.block.confirm.confirm'), TITLE)
blocking(HANA)
ui.at_rest()
ui.capture('03-blocking')
ui.wait_label('bounty-applicants-block-failed', lambda text: ui.t('bounty.block.failed') in text,
              'a failed block does not say 没屏蔽成功')
ui.element(row_id(HANA))
assert by_id(ui.read(), f'bounty-applicant-blocking-{HANA}') is None, 'the progress stays after the failure'
hint_reads(2)
ui.at_rest()
ui.capture('04-failed')

confirm_block(HANA, 'Hana')
ui.gone(row_id(HANA), timeout=30)
hint_reads(1)
items = ui.read()
assert by_id(items, row_id(JIE)) and by_id(items, row_id(AIMAN)), '阿杰 or Aiman left with Hana'
ui.at_rest()
ui.capture('05-hana-gone')

ui.tap(row_id(AIMAN))
hold_reads(ui, ui.t('bounty.select.hold.label', name='Aiman'))
confirm_block(AIMAN, 'Aiman')
mid = hold_reads(ui, ui.t('bounty.select.hold.label', name='Aiman'))
assert mid.get('enabled') is False, f'the hold button is live while the block is in flight: {mid}'
ui.gone(row_id(AIMAN), timeout=30)
hold = hold_reads(ui, ui.t('bounty.select.hold.none'))
assert hold.get('enabled') is False, f'the hold button stays enabled after the checked row was blocked: {hold}'
assert by_id(ui.read(), row_id(JIE)), '阿杰 left with Aiman'
ui.at_rest()
ui.capture('06-checked-blocked')

ui.tap('tab-me')
ui.tap('me-blocked')
ui.element('blocked-screen')
for person, name in (('fixture-applicant-hana', 'Hana'), ('fixture-applicant-aiman', 'Aiman')):
    ui.wait_label(f'blocked-row-{person}', lambda label, name=name: label == name, f'屏蔽名单 does not list {name}')
ui.at_rest()
ui.capture('07-list')
print('PASS: long-press offered 屏蔽Hana, a failure kept the row, Hana left, the checked Aiman cleared the check, 屏蔽名单 lists both')
