import json
import re

from swifttool import run


def lines(shot):
    return [{'text': line['text'], 'x': line['x'] / shot.scale, 'y': line['y'] / shot.scale,
             'width': line['width'] / shot.scale, 'height': line['height'] / shot.scale}
            for line in json.loads(run('ocr', shot.path, timeout=60))]


def inside(box, f, slack=1):
    return (box['x'] >= f['x'] - slack and box['y'] >= f['y'] - slack
            and box['x'] + box['width'] <= f['x'] + f['width'] + slack
            and box['y'] + box['height'] <= f['y'] + f['height'] + slack)


def find(read, pattern, within):
    regex = re.compile(pattern)
    return [line for line in read if regex.search(line['text']) and inside(line, within)]
