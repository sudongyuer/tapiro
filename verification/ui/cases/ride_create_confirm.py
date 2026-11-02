"""确认发布 (206 A) with a kept airport draft: ＋ opens the form directly, 下一步 shows the ticket, 出发 / 集合 / 一共 /
全程约 · 每人约 / 车费怎么分 / 航班 / 行李 rows and 「本月免费 · 还剩 2/3」 with the refund rule; 发出去 closes the sheet and
the new ticket leads 我的拼车."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from ride import open_confirm, open_list  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/ride-create/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py',
        'src/ui/SheetFrame.tsx']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDraft', 'airport']

ui = UI(*sys.argv[1:])
open_list(ui)
open_confirm(ui)
items = ui.read()
expect = {
    'ride-confirm-seats': ui.t('ride.create.confirm.seatsValue', count=4),
    'ride-confirm-split': ui.t('ride.create.form.splitTapiro'),
    'ride-confirm-flight': '09:10',
    'ride-confirm-bags': ui.tn('ride.ticket.bags', 2),
    'ride-confirm-fee': ui.t('ride.create.confirm.free', left=2, of=3),
}
for identifier, value in expect.items():
    row = by_id(items, identifier)
    assert row and value in (row.get('AXLabel') or ''), f'{identifier}: {row and row.get("AXLabel")}'
estimate = by_id(items, 'ride-confirm-estimate')
assert estimate and '76' in estimate.get('AXLabel', '') and '19' in estimate.get('AXLabel', ''), \
    estimate and estimate.get('AXLabel')
ui.element('ride-confirm-gather')
publish = ui.element('ride-confirm-publish')
assert publish.get('AXLabel') == ui.t('ride.create.confirm.publish'), publish.get('AXLabel')
ui.capture('01-confirm')

ui.tap('ride-confirm-publish')
ui.gone('ride-confirm')
ui.element('ride-screen')
ui.wait_label('ride-list-mine', lambda label: label == ui.t('ride.list.heading', title=ui.t('ride.list.mine'), count=3),
              'the published ride is not in 我的拼车')
first = next(i for i in ui.read() if (i.get('AXUniqueId') or '').startswith('ride-ticket-'))
assert '双威 → KLIA2' in (first.get('AXLabel') or ''), f'first ticket: {first.get("AXLabel")}'
ui.capture('02-published')
print('PASS: confirm rows, free fee line, 发出去 closes the sheet and lists the ride first')
