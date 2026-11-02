from board import screen, visible
from bounty import relaunch
from driver import by_id, close, dominant, reach_home, token


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


def add_button(ui):
    return next((i for i in ui.read() if i.get('AXLabel') == ui.t('ride.list.add') and i.get('type') == 'Button'),
                None)


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


def form_scroll_to(ui, identifier, container='ride-form', tries=8):
    for _ in range(tries):
        items = ui.read()
        found, frame = by_id(items, identifier), by_id(items, container)['frame']
        low = frame['y'] + frame['height']
        if found and found['frame']['y'] >= frame['y'] + 40 and found['frame']['y'] + found['frame']['height'] <= low - 40:
            return found
        x = frame['x'] + frame['width'] / 2
        ui.swipe((x, low * 0.85), (x, low * 0.55), 0.4)
    return ui.element(identifier, timeout=5)


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
