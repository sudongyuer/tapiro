from driver import assert_touch_target, by_id



def find(items, prefix):
    return [i for i in items if (i.get('AXUniqueId') or '').startswith(prefix)]


def scroll_to(ui, identifier, tries=6):
    """Form rows below the fold are not in the accessibility tree until scrolled into view, and a row clipped by
    the pinned bottom button is in the tree but a tap on it lands on the button."""
    for _ in range(tries):
        items = ui.read()
        found = by_id(items, identifier)
        sheet = by_id(items, 'pay-sheet')
        f = sheet['frame']
        if found and found['frame']['y'] + found['frame']['height'] <= f['y'] + f['height']:
            return found
        x = f['x'] + f['width'] / 2
        ui.swipe((x, f['y'] + f['height'] * 0.75), (x, f['y'] + f['height'] * 0.3), 0.4)
    return ui.element(identifier, timeout=5)


def method_ids(items):
    return [(i.get('AXUniqueId') or '')[len('pay-method-'):] for i in find(items, 'pay-method-')]


def open_sheet(ui):
    ui.element('ui-verify-ready')
    return ui.element('pay-amount')


def assert_pinned(ui, identifier, name):
    items = ui.read()
    button, sheet = by_id(items, identifier), by_id(items, 'pay-sheet')
    assert button and sheet, f'{name} or the sheet is missing'
    assert_touch_target(button, name)
    f, form = button['frame'], sheet['frame']
    assert f['y'] >= form['y'] + form['height'] - 1, f'{name} is inside the form, not pinned below it: {f}'
    assert f['y'] > form['y'] + form['height'] * 0.75, f'{name} is not in the bottom part of the sheet: {f}'
    return button


def assert_title(ui, key):
    title = ui.labelled(ui.t(key))
    assert title['frame']['y'] < 140, f'{ui.t(key)} is not the sheet title: {title}'
