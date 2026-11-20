import re

import ocr

STATUS_BAR = 50
CLOCK = re.compile(r'^\d{1,2}[:.]\d{2}$')


# The navigation bar's scroll edge effect fades and blurs content scrolled under the status bar until it cannot be
# read; without it the rows stay legible there (audit S1: 进度 and profile, whose Form the bar did not find).
def assert_top_edge(ui, shot, name, read=None):
    read = read if read is not None else ocr.lines_in(shot, ui.locale)
    legible = [line for line in read if line['y'] + line['height'] <= STATUS_BAR
               and not CLOCK.match(line['text'].strip()) and len(line['text'].strip()) >= 3]
    print(f'{name}: lines read under the status bar {[line["text"] for line in legible]}')
    assert not legible, f'{name}: content under the status bar stays legible, so no top scroll edge effect: {legible}'
    return read


def assert_scrolled_under(items, identifier, name, below=STATUS_BAR):
    element = next((i for i in items if i.get('AXUniqueId') == identifier), None)
    assert element, f'{name}: {identifier} is gone'
    f = element['frame']
    assert f['y'] < below < f['y'] + f['height'], f'{name}: {identifier} is not under the status bar ({f})'
