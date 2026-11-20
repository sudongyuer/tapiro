"""收款方式 refetches when it gains focus. When that refetch fails after the list loaded, the old rows stay with a yellow
"可能不是最新 · HH:mm 的数据" card and a 44 pt 重试, never as if they were current."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from payee import open_payee, row_labels  # noqa: E402

DEPS = [
    'src/features/payee/',
    'src/app/(tabs)/me/',
    'verification/ui/payee.py',
]

ARGS = ['-uiVerifyPayeeFail', 'refresh', '-uiVerifySignedIn', 'onboarded']

ui = UI(*sys.argv[1:])
open_payee(ui)
stale = ui.settled(lambda items: by_id(items, 'payee-stale'), 'the failed focus refetch was not marked stale')
items = ui.read()
lead = ui.t('live.staleAt', time='@').split('@')[0]
assert lead in (stale.get('AXLabel') or ''), f'stale card reads {stale.get("AXLabel")!r}'
assert len(row_labels(items)) == 3, f'old rows were dropped: {row_labels(items)}'
assert by_id(items, 'payee-load-failed') is None, 'a ready list was replaced by the load error'
assert_touch_target(by_id(items, 'payee-stale-retry'), 'payee-stale-retry')
ui.capture('01-stale')
print('PASS: stale payee list is marked and keeps its rows')
