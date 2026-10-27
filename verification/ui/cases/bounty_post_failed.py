"""A failed publish shows 没发出去，再试一次 and keeps the form filled; the second 发出去 (same draft) succeeds and closes
the sheet. Started on confirm with the first status load failing, the cost shows 发布费没加载出来 with 重试 and no free
line until 重试 loads it."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import DEMO_TITLE, assert_cost, open_confirm, relaunch, value  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'demo', '-uiVerifyPublish', 'failOnce']
BUDGET = 240

ui = UI(*sys.argv[1:])
open_confirm(ui)
assert_cost(ui, ui.t('bounty.post.cost.free', left=2, of=3))
ui.tap('bounty-post-publish')
ui.wait_label('bounty-post-failed', lambda label: ui.t('bounty.post.confirm.failed') in label, 'the failure is not shown')
ui.wait_label('bounty-post-publish', lambda label: label == ui.t('bounty.post.confirm.publish'), '发出去 did not come back')
ui.capture('01-failed')
ui.tap('BackButton')
ui.element('bounty-post-form')
ui.wait(lambda items: value(ui, 'bounty-post-title') == DEMO_TITLE and value(ui, 'bounty-post-reward') == '8',
        'the form lost its values after a failed publish')
ui.tap_label(ui.t('bounty.post.next'))
ui.element('bounty-post-confirm')
ui.tap('bounty-post-publish')
ui.gone('bounty-post-confirm')
ui.element('home-scroll')

relaunch(ui, drop=['-uiVerifyPublish', 'failOnce'], add=['-uiVerifyScene', 'bounty-confirm', '-uiVerifyStatusFail', '1'],
         ready='ui-verify-ready')
ui.wait_label('bounty-post-cost-failed', lambda label: ui.t('bounty.post.cost.loadFailed') in label,
              'the cost failure is not shown')
items = ui.read()
assert by_id(items, 'bounty-post-cost') is None, 'a cost line is shown although the status failed'
assert by_id(items, 'bounty-post-publish').get('enabled') is False, '发出去 is enabled without a cost'
ui.capture('02-cost-failed')
ui.tap('bounty-post-cost-retry')
assert_cost(ui, ui.t('bounty.post.cost.free', left=2, of=3))
ui.gone('bounty-post-cost-failed')
print('PASS: a failed publish keeps the draft and retries; a failed cost shows 重试 instead of free')
