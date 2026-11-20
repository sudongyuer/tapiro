import ocr
from post_layout import squash


# AX labels carry the whole string even when the drawn line is truncated or clipped, so the pixels are read: every
# word of the text is drawn inside the frame and no line there ends in an ellipsis.
def assert_drawn_whole(ui, shot, frame, text, name, read=None, slack=6):
    read = read if read is not None else ocr.lines_in(shot, ui.locale)
    region = {'x': frame['x'] - slack, 'y': frame['y'] - slack,
              'width': frame['width'] + 2 * slack, 'height': frame['height'] + 2 * slack}
    lines = sorted((line for line in read if ocr.inside(line, region, slack=slack)), key=lambda l: (l['y'], l['x']))
    drawn = squash(''.join(line['text'] for line in lines))
    print(f'{name}: expected {squash(text)!r}, drawn {drawn!r}')
    assert not any(ocr.clipped(line['text']).endswith('…') for line in lines), f'{name} is truncated: {drawn!r}'
    assert squash(text).lower() in drawn.lower(), f'{name} does not draw the whole {text!r}: {drawn!r}'
    return read
