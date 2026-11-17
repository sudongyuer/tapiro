"""The system confirmation dialog (BS-2, BS-3): an action sheet presented as a popover from the control that asked,
its confirm button stacked above a visible keep button."""
from driver import by_id

NEAR = 64


def button(items, label):
    return next((i for i in reversed(items) if i.get('AXLabel') == label and i.get('type') == 'Button'), None)


def bar_button(items, label):
    return next((i for i in items if i.get('AXLabel') == label and i.get('type') == 'Button'), None)


def assert_dialog(ui, title, confirm, keep, source=None, source_label=None):
    def found(items):
        heading = next((i for i in items if i.get('AXLabel') == title and i.get('type') != 'Button'), None)
        yes, no = button(items, confirm), button(items, keep)
        return (heading, yes, no) if heading and yes and no else None

    heading, yes, no = ui.settled(found, f'the dialog {title} with {confirm} and a visible {keep} never settled')
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
    above = a['y'] - (n['y'] + n['height'])
    below = h['y'] - (a['y'] + a['height'])
    assert 0 <= above <= NEAR or 0 <= below <= NEAR, \
        f'the dialog (title {h}, keep {n}) is not a popover from the control that asked {a}: ' \
        f'{above:.0f} pt above it, {below:.0f} pt below it'
    return yes, no


def tap(ui, element):
    f = element['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)
