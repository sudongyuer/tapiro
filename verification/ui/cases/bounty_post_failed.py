"""A failed publish shows 没发出去，再试一次 and keeps the form filled; the second 发出去 (same draft) succeeds and closes
the sheet. Started on confirm with the first status load failing, the cost shows 发布费没加载出来 with 重试 and no free
line until 重试 loads it. When the server says the draft's id already went out (on publish, or found when the form
opens), the draft is cleared and the form says 上次那条已经发出去了."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import DEMO_TITLE, assert_cost, close_sheet_by_swipe, open_confirm, open_post, relaunch, value  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'demo', '-uiVerifyPublish', 'failOnce']
BUDGET = 300

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
ui.capture('03-cost-loaded')

relaunch(ui, drop=['-uiVerifyPublish', 'failOnce'], add=['-uiVerifyPublish', 'alreadySent'])
open_confirm(ui)
ui.tap('bounty-post-publish')
ui.wait_label('bounty-post-already-sent', lambda label: ui.t('bounty.post.form.alreadySent') in label,
              'the form does not say the last post already went out')
ui.wait(lambda items: value(ui, 'bounty-post-title') == '' and value(ui, 'bounty-post-reward') == '',
        'the already-sent draft is still in the form')
ui.capture('04-already-sent-on-publish')

close_sheet_by_swipe(ui)
relaunch(ui, drop=['-uiVerifyPublish', 'failOnce'], add=['-uiVerifyDraftSent', '1'])
open_post(ui)
ui.wait_label('bounty-post-already-sent', lambda label: ui.t('bounty.post.form.alreadySent') in label,
              'opening a draft that was already published does not say so')
ui.wait(lambda items: value(ui, 'bounty-post-title') == '', 'the published draft is still in the form')
ui.capture('05-already-sent-on-open')
print('PASS: a failed publish keeps the draft and retries; a failed cost shows 重试; an already-sent draft is cleared')
