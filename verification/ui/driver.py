import json
import struct
import zlib
import subprocess
import time
from pathlib import Path

BUNDLE_ID = 'app.tapiro'


class UI:
    def __init__(self, udid, output, appearance='light'):
        self.udid, self.output, self.appearance = udid, Path(output), appearance
        self.output.mkdir(parents=True, exist_ok=True)

    def axe(self, *args, timeout=20):
        out = subprocess.check_output(['axe', *args, '--udid', self.udid], text=True, timeout=timeout)
        if out.startswith('Error:'):
            raise RuntimeError(out.strip())
        return out

    def state(self):
        def walk(node):
            if isinstance(node, dict):
                yield node
                for child in node.get('children', []):
                    yield from walk(child)
            elif isinstance(node, list):
                for child in node:
                    yield from walk(child)

        return list(walk(json.loads(self.axe('describe-ui'))))

    def wait(self, predicate, message, timeout=30):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            result = predicate(self.state())
            if result:
                return result
            time.sleep(0.2)  # polling interval, not an assertion
        raise AssertionError(message)

    def element(self, identifier, timeout=30):
        return self.wait(
            lambda items: next((i for i in items if i.get('AXUniqueId') == identifier), None),
            f'Missing {identifier}',
            timeout,
        )

    def tap(self, identifier):
        self.element(identifier)
        self.axe('tap', '--id', identifier, '--post-delay', '0.5')

    def capture(self, name):
        subprocess.run(
            ['xcrun', 'simctl', 'io', self.udid, 'screenshot', str(self.output / f'{name}.png')],
            check=True, timeout=20, capture_output=True,
        )
        (self.output / f'{name}.json').write_text(self.axe('describe-ui'))
        return self.output / f'{name}.png'


def frame(element):
    return element['frame']


def assert_touch_target(element, name):
    f = frame(element)
    assert f['width'] >= 44 and f['height'] >= 44, f'{name} needs a 44 pt target, got {f["width"]}x{f["height"]}'


def pixel(png_path, x, y):
    data = Path(png_path).read_bytes()
    width, height, depth, color_type = struct.unpack('>IIBB', data[16:26])
    assert depth == 8 and color_type in (2, 6), f'unsupported PNG format {depth}/{color_type}'
    channels = 4 if color_type == 6 else 3
    pos, idat = 8, b''
    while pos < len(data):
        length, kind = struct.unpack('>I4s', data[pos:pos + 8])
        if kind == b'IDAT':
            idat += data[pos + 8:pos + 8 + length]
        pos += 12 + length
    raw, stride, prev = zlib.decompress(idat), width * channels, bytearray(width * channels)
    for row in range(y + 1):
        start = row * (stride + 1)
        kind, line = raw[start], bytearray(raw[start + 1:start + 1 + stride])
        for i in range(stride):
            a = line[i - channels] if i >= channels else 0
            b, c = prev[i], prev[i - channels] if i >= channels else 0
            if kind == 1:
                line[i] = (line[i] + a) & 0xFF
            elif kind == 2:
                line[i] = (line[i] + b) & 0xFF
            elif kind == 3:
                line[i] = (line[i] + (a + b) // 2) & 0xFF
            elif kind == 4:
                p = a + b - c
                pa, pb, pc = abs(p - a), abs(p - b), abs(p - c)
                line[i] = (line[i] + (a if pa <= pb and pa <= pc else b if pb <= pc else c)) & 0xFF
        prev = line
    return tuple(prev[x * channels:x * channels + 3])


def assert_appearance(png_path, appearance, x, y, name):
    r, g, b = pixel(png_path, x, y)
    luma = 0.2126 * r + 0.7152 * g + 0.0722 * b
    if appearance == 'dark':
        assert luma < 80, f'{name} is light ({r},{g},{b}) in dark appearance'
    else:
        assert luma > 175, f'{name} is dark ({r},{g},{b}) in light appearance'
