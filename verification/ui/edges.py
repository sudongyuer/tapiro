from driver import luma
from gestures import drag

UNDER_BAR = (24, 50)
CLEAR_OF_STATUS = (105, 280)
SHARP = 90
INK = 12
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


def sharpest_step(shot, regions):
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
    return sharpest


# The navigation bar's scroll edge effect blurs and fades content scrolled under the status bar, so text there keeps
# no hard ink edge; without it (audit S1: the bar never found the Form's scroll view) rows stay crisp under the clock.
# Crisp text steps 128–252 luma between neighbouring pixels, under the effect 20–63. Short held drags move content until
# drawn text sits between the clock and the status icons: the tree also lists the hidden navigation title there, which
# draws nothing (a step of 0), so a region counts only once it shows ink.
def assert_top_edge(ui, name, tries=12):
    for _ in range(tries):
        items = ui.read()
        regions = regions_under_bar(items)
        if regions:
            shot = ui.snap(f'{name}-top-edge')
            sharpest = sharpest_step(shot, regions)
            if sharpest >= INK:
                print(f'{name}: text under the status bar {[r[0] for r in regions]}, sharpest step {sharpest:.0f}')
                assert sharpest < SHARP, \
                    f'{name}: text under the status bar stays crisp (a step of {sharpest:.0f}): no top edge effect'
                return
        w, h = items[0]['frame']['width'], items[0]['frame']['height']
        drag(ui, (w / 2, h * 0.6), (w / 2, h * 0.6 - STEP))
        ui.at_rest()
    raise AssertionError(f'{name}: no drawn text reached the status bar after {tries} drags')
