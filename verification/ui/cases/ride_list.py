"""The 拼车 tab (180 B, 181 A, 182 B, 183 B, 184 A): one list with 我的拼车 then the joinable rides under day subheadings,
each a compact 椰糖杏 ticket with a 每人约 · taken/seats stub. Markers: urgent 「n 分钟后出发 · 集合中」, the organiser's
「我发起的 · 1 人申请」 (both status lines in the ticket inks that read 4.8:1 on the peach, not the status colours), a
neutral 「已满」 ticket and the airport line 「航班 09:10 起飞 · 2 件大行李」. The nav-bar ＋ is
shown, 「去过的 · 2 趟」 closes 我的拼车, and a ticket pushes the ride detail with the same route and flight. The
departure time stays whole and left of the stub; when the status and the time do not fit one line (long copy, AX5)
the time wraps under the status, and the AX5 run checks exactly that."""
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
import ocr  # noqa: E402
from board import ink_box  # noqa: E402
from driver import UI, assert_touch_target, by_id, token  # noqa: E402
from ride import add_button, assert_ticket_colour, label, open_list, tab_bar_top, ticket, within_screen  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py', 'verification/ui/ocr.py',
        'verification/ui/board.py', 'src/ui/HandArt.tsx', 'src/ui/InlineState.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']
STATUS_INK_MIN = 20
STUB_WIDTH = int(re.search(r'const STUB_WIDTH = (\d+);', (Path(__file__).resolve().parents[3]
                                                         / 'src/features/ride/RideTicket.tsx').read_text()).group(1))
# The AX5 run (--text-size ax5) checks only the 我的拼车 tickets: the rest of the walk assumes the Large layout.
LARGE_TEXT = os.environ.get('TAPIRO_TEXT_SIZE', 'large') != 'large'
AX5_HEAD = 140

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
# At AX5 the second ticket can start below the fold (ms); a ticket counts once its status band clears the tab bar.
heads = [identifier for identifier in ('ride-ticket-ride-leaving', 'ride-ticket-ride-requests')
         if not LARGE_TEXT or by_id(items, identifier)['frame']['y'] + AX5_HEAD <= tab_bar_top(items)]
assert 'ride-ticket-ride-leaving' in heads, f'the first ticket\'s status and time are not on screen: {heads}'
for identifier, ink, status in (('ride-ticket-ride-leaving', '--color-on-ride-urgent', '--color-urgent'),
                                ('ride-ticket-ride-requests', '--color-on-ride-warning', '--color-warning')):
    if identifier not in heads:
        continue
    frame = by_id(items, identifier)['frame']
    found = ink_box(shot, frame, token(ink, 'light'), 6)
    assert found and found['count'] >= STATUS_INK_MIN, f'{identifier} status line is not drawn in {ink}: {found}'
    faint = ink_box(shot, frame, token(status, 'light'), 6)
    assert not faint or faint['count'] < STATUS_INK_MIN, f'{identifier} still draws {status} (3.6:1 on the ticket)'
read = ocr.lines_in(shot, ui.locale)
for identifier in heads:
    frame = by_id(items, identifier)['frame']
    main = {**frame, 'width': frame['width'] - STUB_WIDTH}
    clocks = ocr.find(read, r'\d{1,2}[:.]\d{2}', main)
    assert clocks, f'{identifier} cuts its departure time or pushes it under the stub: {[line["text"] for line in read]}'
if LARGE_TEXT:
    print(f'PASS: at AX5 the status lines in the ticket inks and the departure times whole, left of the stub: {heads}')
    sys.exit(0)

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
