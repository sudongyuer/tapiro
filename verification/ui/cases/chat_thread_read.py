"""已读 (125 B): in the demo bounty thread 阿杰 has read up to your last message, so 「已读 hh:mm」 sits under that bubble,
right-aligned, and nowhere else; the ride group 双威 → KLIA2 shows no 已读 at all, names each speaker (美玲, Arif) above
their bubbles, and its item card reads the route, the departure and 招募中."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import CLOCK, bubbles, open_thread  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1']


def reads(items):
    return [i for i in items if (i.get('AXUniqueId') or '').startswith('chat-read-')]


ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', '阿杰')
items = ui.wait(lambda items: len(bubbles(items)) == 3 and reads(items) and items, 'no 已读 in the bounty thread')
[read] = reads(items)
assert read['AXUniqueId'] == 'chat-read-fixture-chat-bounty-c2', read['AXUniqueId']
assert re.fullmatch(ui.pattern('chat.thread.read', time=CLOCK), read.get('AXLabel') or ''), read.get('AXLabel')
mine = next(b for b in bubbles(items) if b['AXUniqueId'] == 'chat-bubble-fixture-chat-bounty-c2')
assert read['frame']['y'] >= mine['frame']['y'] + mine['frame']['height'] - 1, '已读 is not under your message'
right = items[0]['frame']['width'] - (read['frame']['x'] + read['frame']['width'])
assert right < 40, f'已读 is not right-aligned: {read["frame"]}'
ui.at_rest()
ui.capture('01-bounty-read')

ui.tap('BackButton')
ui.element('chat-list')
route = ui.t('chat.list.route', **{'from': '双威', 'to': 'KLIA2'})
ui.tap('chat-row-fixture-chat-ride')
ui.labelled(route)
items = ui.wait(lambda items: len(bubbles(items)) == 3 and items, 'the ride group never showed its messages')
assert not reads(items), 'a ride group shows 已读'
labels = [i.get('AXLabel') for i in items]
assert '美玲' in labels and 'Arif' in labels, 'the group does not name its speakers'
card = by_id(items, 'chat-item-card')
when = '(?:' + ui.pattern('chat.item.today', clock=CLOCK) + '|' + ui.pattern('chat.item.tomorrow', clock=CLOCK) + ')'
status = ui.pattern('chat.item.rideStatus', when=when,
                    status=re.escape(ui.t('chat.item.ride.open')))
assert re.fullmatch(ui.pattern('chat.item.a11y', title=re.escape(route), status=status), card.get('AXLabel') or ''), \
    card.get('AXLabel')
ui.at_rest()
ui.capture('02-ride-group')
print('PASS: 已读 under your last bounty message only; the ride group has no 已读 and names its speakers')
