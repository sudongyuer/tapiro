from driver import luma
from gestures import drag

UNDER_BAR = (24, 50)
CLEAR_OF_STATUS = (105, 280)
SHARP = 90
STEP = 45


def regions_under_bar(items):
    top, bottom = UNDER_BAR
    left, right = CLEAR_OF_STATUS
    regions = []
    for item in items:
        f = item['frame']
        if item.get('type') != 'StaticText' or f['y'] >= bottom or f['y'] + f['height'] <= top:
            continue
        x0, x1 = max(f['x'], left), min(f['x'] + f['width'], right)
        y0, y1 = max(f['y'], top), min(f['y'] + f['height'], bottom)
        if x1 - x0 >= 8 and y1 - y0 >= 4:
            regions.append((item.get('AXLabel'), x0, x1, y0, y1))
    return regions


# Short held drags move the content until a line of text sits under the clock, wherever the locale's copy left it;
# the blur reaches only about 55 pt down, and below it rows are crisp either way.
def scroll_under_bar(ui, tries=12):
    for _ in range(tries):
        items = ui.read()
        if regions_under_bar(items):
            return items
        w, h = items[0]['frame']['width'], items[0]['frame']['height']
        drag(ui, (w / 2, h * 0.6), (w / 2, h * 0.6 - STEP))
        ui.at_rest()
    raise AssertionError(f'no text reached the status bar after {tries} drags')


# The navigation bar's scroll edge effect blurs and fades content scrolled under the status bar, so text there has no
# hard ink edge left; without it (audit S1: the bar never found the Form's scroll view) the rows stay crisp under the
# clock and back button. Crisp text steps 110–250 luma between neighbouring pixels; under the effect it measured 20–64.
# The band between the clock and the status icons is read, inside the text that the tree places there.
def assert_top_edge(shot, items, name):
    regions = regions_under_bar(items)
    assert regions, f'{name}: no text sits under the status bar, so the edge effect cannot be seen'
    step = 1 / shot.scale
    sharpest = 0
    for _, x0, x1, y0, y1 in regions:
        y = y0
        while y < y1:
            x, previous = x0, None
            while x < x1:
                value = luma(shot.rgb(x, y))
                if previous is not None:
                    sharpest = max(sharpest, abs(value - previous))
                previous, x = value, x + step
            y += step
    print(f'{name}: text under the status bar {[r[0] for r in regions]}, sharpest step {sharpest:.0f}')
    assert sharpest < SHARP, f'{name}: text under the status bar stays crisp (a step of {sharpest:.0f}): no top edge effect'
