import json
import re
from datetime import date, datetime

from board import screen, visible
from bounty import relaunch
from choose import defaults
from driver import by_id, close, dominant, reach_home, token
from gestures import drag
from hourcycle import clock_at


def open_list(ui, ready='ride-screen'):
    reach_home(ui)
    ui.tap('tab-ride')
    ui.wait(lambda items: str((by_id(items, 'tab-ride') or {}).get('AXValue')) == '1', '拼车 is not selected')
    return ui.element(ready)


def relaunch_list(ui, drop=(), add=(), ready='ride-screen'):
    relaunch(ui, drop=list(drop), add=list(add))
    ui.tap('tab-ride')
    return ui.element(ready)


def ticket(ui, identifier):
    return visible(ui, identifier)


def label(ui, identifier):
    return (ui.element(identifier) or {}).get('AXLabel') or ''


NAV_BAR_BOTTOM = 120


def add_button(ui):
    # 发起拼车 on the moment screen and the joinable card share the ＋ label; the toolbar item alone has no identifier.
    return next((i for i in ui.read() if i.get('AXLabel') == ui.t('ride.list.add') and i.get('type') == 'Button'
                 and not i.get('AXUniqueId') and i['frame']['y'] + i['frame']['height'] <= NAV_BAR_BOTTOM), None)


def open_create(ui):
    ui.tap_label(ui.t('ride.list.add'))
    return ui.wait(lambda items: by_id(items, 'ride-pick') or by_id(items, 'ride-form'),
                   'neither 去哪儿？ nor the form opened')


def ticket_fill(ui, shot, element):
    f = element['frame']
    return dominant(shot, {'x': f['x'] + 8, 'y': f['y'] + 8, 'width': 24, 'height': 6})


def assert_ticket_colour(ui, shot, element, token_name, name):
    found = ticket_fill(ui, shot, element)
    expected = token(token_name, ui.appearance)
    assert close(found, expected, 8), f'{name} is {found}, expected {token_name} {expected}'


def within_screen(items, identifier):
    f = by_id(items, identifier)['frame']
    s = screen(items)
    assert f['x'] >= 0 and f['x'] + f['width'] <= s['width'] + 0.5, f'{identifier} overflows: {f}'


def form_band(items, container):
    frame = by_id(items, container)['frame']
    pinned = by_id(items, f'{container}-ticket')
    top = max(frame['y'] + 40, pinned['frame']['y'] + pinned['frame']['height'] + 8 if pinned else 0)
    return frame, top, frame['y'] + frame['height'] - 40


def form_scroll_to(ui, identifier, container='ride-form', tries=12):
    # The form is a lazy list: rows far from the viewport have no AX node, so a missing row may be above or below.
    down, last = True, None
    for _ in range(tries):
        items = ui.read()
        found = by_id(items, identifier)
        frame, top, low = form_band(items, container)
        if found:
            f = found['frame']
            if f['y'] >= top and f['y'] + f['height'] <= low:
                return found
            down = f['y'] + f['height'] > low
        else:
            seen = [i['frame']['y'] for i in items if (i.get('AXUniqueId') or '').startswith(f'{container}-')]
            if seen == last:
                down = not down
            last = seen
        x = frame['x'] + frame['width'] / 2
        start, end = (low - 20, top + (low - top) * 0.45) if down else (top + 20, top + (low - top) * 0.55)
        drag(ui, (x, start), (x, end), duration=0.6, steps=30)
    raise AssertionError(f'{identifier} never came into view between the ticket and the bottom of {container}')


def step(ui, identifier, up=True, times=1):
    for _ in range(times):
        f = ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled')['frame']
        ui.tap_point(f['x'] + f['width'] * (0.78 if up else 0.22), f['y'] + f['height'] / 2)


def open_form(ui, tile=None):
    if open_create(ui).get('AXUniqueId') == 'ride-pick':
        ui.tap(f'ride-pick-{tile}' if tile else 'ride-pick-free')
    return ui.element('ride-form')


def open_confirm(ui):
    open_form(ui)
    ui.tap_label(ui.t('ride.create.next'))
    return ui.element('ride-confirm')


def tap_bar(ui, identifier):
    def match(items):
        found = [i for i in items if i.get('AXUniqueId') == identifier]
        return next((i for i in found if i.get('type') == 'Button'), found[0] if found else None)
    # SwiftUI toolbar buttons in a sheet expose the identifier twice (the button and its label), so axe tap --id refuses.
    f = ui.settled(match, f'{identifier} never settled')['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)


def assert_stamp_under_sticker(items, identifier):
    # The stamp hangs from the top of the ticket, under the car sticker (192 A), clear of the tear above the cells.
    stamp, ticket_frame = by_id(items, identifier)['frame'], by_id(items, 'ride-detail-ticket')['frame']
    cells = min(i['frame']['y'] for i in items if (i.get('AXUniqueId') or '').startswith('ride-detail-cell-'))
    drop = stamp['y'] - ticket_frame['y']
    assert 48 <= drop <= 70, f'{identifier} sits {drop:.0f} pt below the ticket top, expected under the sticker'
    assert stamp['y'] + stamp['height'] <= cells - 16, f'{identifier} crosses the tear: {stamp}, cells at {cells}'


def tab_bar_top(items):
    tabs = [i['frame']['y'] for i in items if (i.get('AXUniqueId') or '').startswith('tab-')]
    return min(tabs) if tabs else screen(items)['height']


def tap_clear(ui, identifier, tries=6):
    def clear(items):
        found = by_id(items, identifier)
        if not found:
            return None
        f = found['frame']
        return found if f['y'] >= NAV_BAR_BOTTOM and f['y'] + f['height'] <= tab_bar_top(items) - 8 else None

    for _ in range(tries):
        items = ui.read()
        if clear(items):
            break
        s = screen(items)
        ui.swipe((s['width'] / 2, s['height'] * 0.7), (s['width'] / 2, s['height'] * 0.45), 0.4)
    # The floating tab bar covers the scroll view's bottom; a tap there lands on 拼车 and pops the stack.
    f = ui.settled(clear, f'{identifier} never cleared the tab bar')['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)


CLOCK_IN_VALUE = re.compile(r'([^\d\s,]*)\s*(\d{1,2})[:.](\d{2})\s*([^\d\s,]*)')
AFTERNOON = ('PM', 'PTG', 'P.M.', '下午', '晚上')
MORNING = ('AM', 'PG', 'A.M.', '凌晨', '上午', '早上')
TIME_TEXT = re.compile(r'(?:凌晨|早上|上午|中午|下午|晚上)?\d{1,2}[:.]\d{2}(?:\s?(?:AM|PM|PG|PTG|A\.M\.|P\.M\.))?')


def time_text(label):
    found = TIME_TEXT.search(' '.join((label or '').split()))
    return found.group() if found else None


def clock_24h(text):
    found = CLOCK_IN_VALUE.search(text)
    assert found, f'no clock in the picker value {text!r}'
    marker, hours, minutes, suffix = found[1], int(found[2]), found[3], found[4].upper()
    # zh-Hans puts 下午 before the clock (下午5:00), so the date may run into it: 2026年11月3日下午5:00.
    if (suffix in AFTERNOON or any(marker.endswith(m) for m in AFTERNOON)) and hours < 12:
        hours += 12
    elif (suffix in MORNING or any(marker.endswith(m) for m in MORNING)) and hours == 12:
        hours = 0
    return f'{hours:02d}:{minutes}'


def pay_reminders(ui):
    text = defaults(ui, 'uiVerifyScheduledNotices')
    notices = [n for n in (json.loads(text) if text else []) if n['id'].endswith((':pay24', ':pay72'))]
    return sorted(notices, key=lambda notice: notice['at'])


def reminder_when(ui, at):
    moment = datetime.fromtimestamp(at / 1000)
    days = (moment.date() - date.today()).days
    time = clock_at(moment.hour, moment.minute, ui.locale)
    if days not in (0, 1):
        return r'.+ ' + time
    day = ui.t('ride.list.today' if days == 0 else 'ride.list.tomorrow')
    return ui.pattern('ride.ticket.time', day=re.escape(day[0].lower() + day[1:]), clock=time)


def wait_owe_reminder(ui, kinds):
    seen, matched = [], []

    # The fixture places the split 25 h 44 min before each load, so a reload moves the reminders; read both together.
    def names_first(label):
        pay = pay_reminders(ui)
        seen.append(([notice['data']['kind'] for notice in pay], label))
        if seen[-1][0] != kinds:
            return False
        if re.fullmatch(ui.pattern('rideSettle.owe.next', time=reminder_when(ui, pay[0]['at'])), label) is None:
            return False
        matched[:] = pay
        return True

    try:
        ui.wait_label('ride-settle-owe-reminder', names_first, 'the owing card does not name the first reminder')
    except AssertionError:
        raise AssertionError(f'expected {kinds} scheduled and the card naming {kinds[0]}; saw {seen[-1:]}') from None
    return matched
