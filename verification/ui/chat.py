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

