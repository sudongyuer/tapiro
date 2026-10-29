"""Lost race (ruling 6, 52A): with -uiVerifySelect taken another device already chose 阿杰, so holding on Hana shows the
system alert 已经选好了 naming 阿杰 (read from the reloaded detail) over the busy button; 好的 turns the screen into
选好了阿杰 with 阿杰 as one row and the address, and the fixture received exactly one select call."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from choose import HANA, HOLD, assert_attempts, choose, hold_select  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/bounty/select/', 'src/features/bounty/shared/', 'src/features/bounty/board/', 'src/ui/TierMark.tsx', 'src/ui/HoldButton.tsx', 'src/app/(tabs)/bounty/', 'verification/ui/choose.py']
SCENE = 'bounty-applicants'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifySelect', 'taken']
BUDGET = 240

ui = UI(*sys.argv[1:])

choose(ui, HANA, 'Hana')
hold_select(ui)
ui.labelled(ui.t('bounty.select.race.title'))
body = ui.t('bounty.select.race.body', name='阿杰')
ui.labelled(body)
ui.capture('01-race-alert')
ui.tap_label(ui.t('bounty.select.race.ok'))
ui.wait_label('bounty-select-done', lambda text: text == ui.t('bounty.select.done.title', name='阿杰'),
              'the screen did not become 选好了阿杰 after 好的')
row = ui.element('bounty-select-done-row')
assert '阿杰' in (row.get('AXLabel') or ''), f'the chosen row reads {row.get("AXLabel")!r}'
assert 'Hana' not in (row.get('AXLabel') or ''), row.get('AXLabel')
address = ui.element('bounty-select-done-address')
assert 'A 座 12-03' in (address.get('AXLabel') or ''), f'the address reads {address.get("AXLabel")!r}'
items = ui.read()
assert by_id(items, HOLD) is None, 'the hold button is still shown after the race'
assert by_id(items, f'bounty-applicant-{HANA}') is None, 'the applicant list is still shown after the race'
assert_attempts(ui, 1)
ui.at_rest()
ui.capture('02-race-done')
print('PASS: holding on Hana after 阿杰 was chosen elsewhere shows 已经选好了 naming 阿杰, then 选好了阿杰')
