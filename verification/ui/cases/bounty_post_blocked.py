"""With two unpaid payments, confirm shows 先付清再发新的 naming 阿杰 RM 15 and Lily RM 6, 去付款 as the primary action and a
disabled 发出去 under it; 去付款 closes the post sheet and opens the pay sheet for 阿杰 (the oldest), and the draft is kept."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import DEMO_TITLE, assert_pinned, open_confirm, open_post, value  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx', 'src/app/pay/', 'src/features/payment/']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'demo', '-uiVerifyUnpaid', 'two']
BUDGET = 240

ui = UI(*sys.argv[1:])
open_confirm(ui)
ui.wait_label('bounty-post-blocked', lambda label: ui.t('bounty.post.blocked.title') in label
              and re.search(r'阿杰 RM\s?15\b', label) and re.search(r'Lily RM\s?6\b', label),
              'the blocked notice does not name 阿杰 RM 15 and Lily RM 6')
pay = assert_pinned(ui, 'bounty-post-pay', '去付款')
assert pay.get('AXLabel') == ui.t('bounty.post.confirm.pay'), f'pay button reads {pay.get("AXLabel")!r}'
publish = by_id(ui.read(), 'bounty-post-publish')
assert publish and publish.get('enabled') is False, '发出去 is not disabled while blocked'
assert publish['frame']['y'] > pay['frame']['y'], '发出去 is not under 去付款'
ui.capture('01-blocked')
ui.tap('bounty-post-pay')
ui.gone('bounty-post-confirm')
ui.wait_label('pay-amount', lambda label: ui.t('pay.sheet.payTo', name='阿杰') in label, 'the pay sheet is not for 阿杰')
ui.capture('02-pay-sheet')
ui.tap_label(ui.t('pay.sheet.close'))
ui.gone('pay-amount')
open_post(ui)
ui.wait(lambda items: value(ui, 'bounty-post-title') == DEMO_TITLE, 'the draft was not kept after 去付款')
print('PASS: blocked confirm names both payments, 去付款 opens the oldest, the draft is kept')
