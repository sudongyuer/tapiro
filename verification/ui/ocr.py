import json
import re

from swifttool import run


def lines(shot, languages=None):
    args = [shot.path, ','.join(languages)] if languages else [shot.path]
    # Vision's en-US reading returns the Turkish dotless ı for i (「Lihat Butıran」).
    return [{'text': line['text'].replace('ı', 'i'), 'x': line['x'] / shot.scale, 'y': line['y'] / shot.scale,
             'width': line['width'] / shot.scale, 'height': line['height'] / shot.scale}
            for line in json.loads(run('ocr', *args, timeout=60))]


def lines_in(shot, locale):
    # zh-Hans first misreads Latin (「lebih jauh」 as 「lebin jaun」); en-US first loses Chinese, so Latin locales read twice.
    return lines(shot) + ([] if locale == 'zh-Hans' else lines(shot, ['en-US', 'zh-Hans']))


def inside(box, f, slack=1):
    return (box['x'] >= f['x'] - slack and box['y'] >= f['y'] - slack
            and box['x'] + box['width'] <= f['x'] + f['width'] + slack
            and box['y'] + box['height'] <= f['y'] + f['height'] + slack)


def find(read, pattern, within):
    regex = re.compile(pattern)
    return [line for line in read if regex.search(line['text']) and inside(line, within)]
