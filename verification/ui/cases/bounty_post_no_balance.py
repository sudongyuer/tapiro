"""With no free post and no coin, the cost row reads 1 貘币 · 余额 0, the 还差 1 貘币 notice names the next free date and
how to earn one, and 需要 1 貘币 is disabled under the kept draft, and nothing offers a purchase."""
import json
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import DEMO_TITLE, assert_cost, assert_pinned, assert_preview, open_confirm  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'demo', '-uiVerifyPostCost', 'none']

ui = UI(*sys.argv[1:])


def nodes(node):
    yield node
    for child in node.get('children') or []:
        yield from nodes(child)


def holds(node, identifier):
    return any(n.get('AXUniqueId') == identifier for n in nodes(node))


def sheet_items(tree):
    node = {'children': tree}
    while holds(node, 'home-scroll'):
        inner = [child for child in node.get('children') or [] if holds(child, 'bounty-post-confirm')]
        assert inner, 'the accessibility tree has no bounty-post-confirm sheet'
        node = inner[0]
    return list(nodes(node))


open_confirm(ui)
assert_cost(ui, ui.t('bounty.post.cost.coin', balance=0))
body = re.compile(ui.pattern('bounty.post.noBalance.body', date=r'\S.*\S'))
ui.wait_label('bounty-post-no-balance', lambda label: ui.t('bounty.post.noBalance.title') in label
              and body.search(label) and ui.t('bounty.post.noBalance.earn') in label, 'the 还差 1 貘币 notice is incomplete')
button = assert_pinned(ui, 'bounty-post-publish', '需要 1 貘币')
assert button.get('AXLabel') == ui.t('bounty.post.confirm.needCoin'), f'button reads {button.get("AXLabel")!r}'
assert button.get('enabled') is False, '需要 1 貘币 is not disabled'
ui.capture('01-no-balance')
assert_preview(ui, DEMO_TITLE, '8')
items = sheet_items(json.loads(ui.axe('describe-ui')))
sheet = by_id(items, 'bounty-post-confirm')['frame']
below = [i for i in items if i.get('type') == 'Button' and i['frame']['y'] >= sheet['y'] + sheet['height'] - 1]
assert [i.get('AXUniqueId') for i in below] == ['bounty-post-publish'], f'unexpected actions under the form: {below}'
print('PASS: no balance shows the notice and a disabled 需要 1 貘币 without a purchase')
