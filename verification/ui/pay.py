from driver import by_id



def find(items, prefix):
    return [i for i in items if (i.get('AXUniqueId') or '').startswith(prefix)]


def scroll_to(ui, identifier, tries=6):
    """Form rows below the fold are not in the accessibility tree until scrolled into view."""
    for _ in range(tries):
        items = ui.read()
        found = by_id(items, identifier)
        if found:
            return found
        sheet = by_id(items, 'pay-sheet')
        f = sheet['frame']
        x = f['x'] + f['width'] / 2
        ui.swipe((x, f['y'] + f['height'] * 0.75), (x, f['y'] + f['height'] * 0.3), 0.4)
    return ui.element(identifier, timeout=5)


def method_ids(items):
    return [(i.get('AXUniqueId') or '')[len('pay-method-'):] for i in find(items, 'pay-method-')]


def open_sheet(ui):
    ui.element('ui-verify-ready')
    return ui.element('pay-amount')
