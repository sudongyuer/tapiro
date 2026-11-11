"""273 A: with no free post and no coin, the cost row reads 1 貘币 · 余额 0, the 还差 1 貘币 notice names the next free date
and how to earn one, the three packs follow right under it, and 需要 1 貘币 is disabled under the kept draft; the pinned
bar offers nothing else. Buying 5 coins there (credited by the server) turns the button into 发出去 · 1 貘币, enabled, the
cost row into 1 貘币 · 余额 5, removes the notice and the packs, and keeps the draft."""
import json
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import DEMO_TITLE, assert_cost, assert_pinned, assert_preview, open_confirm  # noqa: E402
from coins import tap_price, assert_packs  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx', 'src/features/place/', 'src/features/block/',
        'src/features/coins/buy/', 'src/features/coins/purchase/', 'src/lib/uiVerifyPurchases.ts', 'verification/ui/coins.py']
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
bar = button['frame']['y'] - 1
below = [i for i in items if i.get('type') == 'Button' and bar <= i['frame']['y'] <= sheet['y'] + sheet['height']]
assert [i.get('AXUniqueId') for i in below] == ['bounty-post-publish'], f'unexpected actions in the pinned bar: {below}'

ui.element('bounty-post-packs-buy-5', timeout=30)
items = assert_packs(ui, 'bounty-post-packs')
card = by_id(items, 'bounty-post-no-balance')['frame']
first = by_id(items, 'bounty-post-packs-buy-5')['frame']
cost = by_id(items, 'bounty-post-cost')['frame']
assert card['y'] + card['height'] <= first['y'] < cost['y'], f'the packs are not right under the notice: {card} {first} {cost}'
ui.at_rest()
ui.capture('02-packs')

tap_price(ui, 'bounty-post-packs-buy-5')
assert_cost(ui, ui.t('bounty.post.cost.coin', balance=5))
ui.wait(lambda items: by_id(items, 'bounty-post-no-balance') is None and by_id(items, 'bounty-post-packs-buy-5') is None,
        'the notice or the packs stayed after the purchase')
ui.wait_label('bounty-post-publish', lambda label: label == ui.t('bounty.post.confirm.publishCoin'),
              'the button never turned into 发出去 · 1 貘币')
assert by_id(ui.read(), 'bounty-post-publish').get('enabled') is True, '发出去 · 1 貘币 is disabled'
assert_preview(ui, DEMO_TITLE, '8')
ui.at_rest()
ui.capture('03-bought')
print('PASS: no balance shows the notice with the packs, and buying one lets the draft go out with a coin')
