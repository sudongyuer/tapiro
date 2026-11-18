"""The system confirmation dialog (BS-2, BS-3): an action sheet presented as a popover from the control that asked,
its confirm button stacked above a visible keep button."""
from driver import by_id

NEAR = 64


def button(items, label, besides=None):
    return next((i for i in reversed(items) if i.get('AXLabel') == label and i.get('type') == 'Button'
                 and (besides is None or i.get('AXUniqueId') != besides)), None)


def bar_button(items, label):
    return next((i for i in items if i.get('AXLabel') == label and i.get('type') == 'Button'), None)


def assert_dialog(ui, title, confirm, keep, source=None, source_label=None):
    def found(items):
        heading = next((i for i in items if i.get('AXLabel') == title and i.get('type') != 'Button'), None)
        return button(items, keep, source) if heading and button(items, confirm, source) else None

    ui.settled(found, f'the dialog {title} with {confirm} and a visible {keep} never settled')
    items = ui.read()
    heading = next(i for i in items if i.get('AXLabel') == title and i.get('type') != 'Button')
    yes, no = button(items, confirm, source), button(items, keep, source)
    assert yes and no, f'the dialog {title} lost {confirm} or {keep} while settling'
    h, y, n = heading['frame'], yes['frame'], no['frame']
    assert y['y'] + y['height'] <= n['y'] + 1, f'{confirm} {y} is not stacked above {keep} {n}'
    assert abs(y['x'] - n['x']) < 2 and abs(y['width'] - n['width']) < 2, \
        f'{confirm} {y} and {keep} {n} are not one column'
    if source is None and source_label is None:
        return yes, no
    items = ui.read()
    anchor = by_id(items, source) if source else bar_button(items, source_label)
    assert anchor, f'the control that asked ({source or source_label}) is not on screen'
    a = anchor['frame']
    left = min(h['x'], n['x'])
    right = max(h['x'] + h['width'], n['x'] + n['width'])
    gaps = {'above': a['y'] - (n['y'] + n['height']), 'below': h['y'] - (a['y'] + a['height']),
            'left of': a['x'] - right, 'right of': left - (a['x'] + a['width'])}
    assert any(0 <= gap <= NEAR for gap in gaps.values()), \
        f'the dialog (title {h}, keep {n}) is not a popover from the control that asked {a}: ' + \
        ', '.join(f'{gap:.0f} pt {side} it' for side, gap in gaps.items())
    return yes, no


def tap(ui, element):
    f = element['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)
