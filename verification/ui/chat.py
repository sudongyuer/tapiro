import re

from driver import by_id, reach_home

ROW_FILL = {'light': (255, 255, 255), 'dark': (28, 28, 30)}
LIST_GROUND = {'light': (242, 242, 247), 'dark': (0, 0, 0)}
CLOCK = r'\d{2}:\d{2}'


def open_list(ui, ready='chat-list'):
    reach_home(ui)
    ui.tap('tab-messages')
    ui.wait(lambda items: str((by_id(items, 'tab-messages') or {}).get('AXValue')) == '1', '消息 is not selected')
    return ui.element(ready, timeout=45)


def rows(items):
    found = [i for i in items if (i.get('AXUniqueId') or '').startswith('chat-row-')
             and not i['AXUniqueId'].endswith('-unread')]
    return sorted(found, key=lambda i: i['frame']['y'])


def row_id(element):
    return element['AXUniqueId'][len('chat-row-'):]


def row_label(ui, title, side, last, time=CLOCK, unread=False):
    plain = ui.pattern('chat.list.a11y', title=re.escape(title), side=re.escape(side), last=re.escape(last),
                       time=time)
    return re.compile(ui.pattern('chat.list.a11yUnread', label=plain) if unread else plain)


def badge_pixels(ui, shot, items):
    f = by_id(items, 'tab-messages')['frame']
    return shot.count({**f, 'height': f['height'] / 2}, lambda rgb: rgb[0] > 200 and rgb[1] < 110 and rgb[2] < 110)


def within_screen(items, element):
    width = items[0]['frame']['width']
    f = element['frame']
    assert f['x'] >= 0 and f['x'] + f['width'] <= width + 0.5, f'{element.get("AXUniqueId")} overflows: {f}'



BUBBLE = 'chat-bubble-'


def open_thread(ui, thread_id, title):
    open_list(ui)
    ui.tap(f'chat-row-{thread_id}')
    ui.labelled(title)
    ui.gone('chat-list')
    return ui.element('chat-safety', timeout=45)


def bubbles(items):
    found = [i for i in items if (i.get('AXUniqueId') or '').startswith(BUBBLE)]
    return sorted(found, key=lambda i: i['frame']['y'])


def bubble_key(element):
    return element['AXUniqueId'][len(BUBBLE):]


def tab_bar_hidden(items):
    tab = by_id(items, 'tab-messages')
    if tab is None:
        return True
    f = tab['frame']
    return f['y'] >= items[0]['frame']['height'] or f['height'] == 0


def chat_calls(ui, name, count, timeout=10, where=None):
    import json
    import time

    from choose import defaults
    deadline = time.monotonic() + timeout
    while True:
        text = defaults(ui, 'uiVerifyChatCalls')
        found = [call['args'] for call in json.loads(text or '[]')
                 if call['name'] == name and (where is None or where(call['args']))]
        if len(found) >= count or time.monotonic() >= deadline:
            return found
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously


def tap_button(ui, label):
    found = ui.settled(lambda items: next((i for i in reversed(items) if i.get('AXLabel') == label
                                           and i.get('type') == 'Button'), None), f'no {label} button')
    f = found['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)


def open_menu(ui, first):
    ui.tap_label(ui.t('chat.menu.more'))
    return ui.labelled(first)


def menu_pick(ui, label):
    found = ui.settled(lambda items: next((i for i in reversed(items) if i.get('AXLabel') == label), None),
                       f'menu item {label} never settled')
    f = found['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)


def sheet_action(ui, label):
    found = ui.settled(lambda items: next((i for i in items if i.get('AXLabel') == label
                                           and i.get('type') == 'Button'), None),
                       f'action sheet button {label} never settled')['frame']
    ui.tap_point(found['x'] + found['width'] / 2, found['y'] + found['height'] / 2)


def labels(items):
    return [i.get('AXLabel') for i in items]


def pick_image(ui, item_key):
    ui.tap('chat-composer-attach')
    ui.labelled(ui.t('chat.thread.photo'))
    menu_pick(ui, ui.t(item_key))


def drawn(shot, f, minimum=150):
    # The fixture images are stretched QR codes: a drawn one has both near-black and near-white pixels, while the
    # placeholder fill is one grey (light in light mode, dark in dark mode) and fails one of the two counts.
    dark = shot.count(f, lambda rgb: max(rgb) < 50, pad=-2)
    light = shot.count(f, lambda rgb: min(rgb) > 215, pad=-2)
    assert dark >= minimum and light >= minimum, f'the image is not drawn in {f} ({dark} dark, {light} light)'
    return dark, light
