"""The 拼车 tab (180 B, 181 A, 182 B, 183 B, 184 A): one list with 我的拼车 then the joinable rides under day subheadings,
each a compact 椰糖杏 ticket with a 每人约 · taken/seats stub. Markers: urgent 「n 分钟后出发 · 集合中」, the organiser's
「我发起的 · 1 人申请」, a neutral 「已满」 ticket and the airport line 「航班 09:10 起飞 · 2 件大行李」. The nav-bar ＋ is
shown, 「去过的 · 2 趟」 closes 我的拼车, and a ticket pushes the ride detail with the same route and flight."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id  # noqa: E402
from ride import add_button, assert_ticket_colour, label, open_list, ticket, within_screen  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py', 'src/ui/HandArt.tsx',
        'src/ui/InlineState.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']

ui = UI(*sys.argv[1:])


def plural(key, count):
    return ui.tn(key, count)


open_list(ui)
leaving = ui.element('ride-ticket-ride-leaving')
items = ui.read()
assert add_button(ui), 'the nav-bar ＋ is missing'
mine = by_id(items, 'ride-list-mine')
assert mine and mine.get('AXLabel') == ui.t('ride.list.heading', title=ui.t('ride.list.mine'), count=2), \
    f'我的拼车 heading: {mine and mine.get("AXLabel")}'
leaving_text = re.compile(ui.pattern('ride.ticket.leaving_other', count=r'\d+'))
assert leaving_text.match(leaving.get('AXLabel') or ''), f'urgent ticket label: {leaving.get("AXLabel")}'
assert label(ui, 'ride-ticket-ride-requests').startswith(plural('ride.ticket.requests', 1)), \
    label(ui, 'ride-ticket-ride-requests')
for identifier in ('ride-ticket-ride-leaving', 'ride-ticket-ride-requests'):
    assert_touch_target(by_id(items, identifier), identifier)
    within_screen(items, identifier)
shot = ui.snap('01-mine')
assert_ticket_colour(ui, shot, by_id(items, 'ride-ticket-ride-leaving'), '--color-ride', 'mine ticket')

history = ticket(ui, 'ride-list-history')
assert history.get('AXLabel') == plural('ride.list.history', 2), history.get('AXLabel')
assert_touch_target(history, '去过的 row')

full = ticket(ui, 'ride-ticket-ride-full')
assert full.get('AXLabel', '').startswith(ui.t('ride.ticket.full')), full.get('AXLabel')
day = ui.element('ride-list-day-0')
assert ui.t('ride.list.joinable') in (day.get('AXLabel') or ''), f'first day heading: {day.get("AXLabel")}'
shot = ui.snap('02-full')
assert_ticket_colour(ui, shot, ui.element('ride-ticket-ride-full'), '--color-card-calm', 'full ticket')

airport = ticket(ui, 'ride-ticket-ride-airport')
airport_label = airport.get('AXLabel') or ''
assert ui.t('ride.ticket.flight', time='09:10') in airport_label, airport_label
assert plural('ride.ticket.bags', 2) in airport_label, airport_label
ticket(ui, 'ride-ticket-ride-mall')
items = ui.read()
for identifier in ('ride-ticket-ride-airport', 'ride-ticket-ride-mall'):
    within_screen(items, identifier)
ui.capture('03-airport')

ui.tap('ride-ticket-ride-airport')
ui.element('ride-detail')
detail = ui.element('ride-detail-ticket')
assert ui.t('ride.ticket.flight', time='09:10') in (detail.get('AXLabel') or ''), detail.get('AXLabel')
ui.capture('04-detail')
ui.tap('BackButton')
ui.element('ride-screen')
ui.gone('ride-detail')
print('PASS: sections, markers, airport line, history row, ＋ and the detail')
