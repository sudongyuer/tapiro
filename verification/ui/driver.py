import json
import os
import re
import struct
import sys
import tempfile
import zlib
import subprocess
import time
from pathlib import Path

BUNDLE_ID = 'app.tapiro'
TRANSITION_ERROR = 'No translation object returned for simulator'


class AxeError(RuntimeError):
    pass


class Transition(AxeError):
    pass


STRINGS = Path(__file__).resolve().parents[2] / '.verify/ui-strings.json'
INTERPOLATION = re.compile(r'\{\{\s*(\w+)\s*\}\}')


def load_strings():
    return json.loads(STRINGS.read_text())


# `axe type` sends keys with no delay; the SwiftUI TextField re-renders React on every change and dropped trailing
# keys in dark runs (2026-10-26), so plain lower-case letters and digits go through paced key-sequence instead.
HID_KEYCODES = {
    **{chr(ord('a') + offset): str(4 + offset) for offset in range(26)},
    **{str(digit): str(29 + digit) for digit in range(1, 10)},
    '0': '39',
}


class UI:
    def __init__(self, udid, output, appearance='light', locale='zh-Hans'):
        self.udid, self.output, self.appearance, self.locale = udid, Path(output), appearance, locale
        self.output.mkdir(parents=True, exist_ok=True)
        self.launch_args = os.environ.get('TAPIRO_VERIFY_ARGS', '').split()
        self.strings = load_strings()

    def t(self, key, **values):
        return self.t_in(self.locale, key, **values)

    def t_in(self, locale, key, **values):
        table = self.strings[locale]
        if key not in table:
            raise KeyError(f'no UI string {key!r} for {locale}')
        return INTERPOLATION.sub(lambda m: str(values[m.group(1)]), table[key])

    def pattern(self, key, **patterns):
        marks = {name: f'PATTERN{index}X' for index, name in enumerate(patterns)}
        escaped = re.escape(self.t(key, **marks))
        for name, mark in marks.items():
            escaped = escaped.replace(mark, patterns[name])
        return escaped

    def other_locale(self):
        return 'zh-Hans' if self.locale == 'en' else 'en'

    def tagged(self, key, tag):
        found = re.search(rf'<{tag}>(.*?)</{tag}>', self.t(key))
        if not found:
            raise KeyError(f'UI string {key!r} has no <{tag}> section')
        return found.group(1)

    def axe(self, *args, timeout=20):
        started = time.monotonic()
        proc = subprocess.run(['axe', *args, '--udid', self.udid], text=True, capture_output=True, timeout=timeout)
        print(f'{time.monotonic() - started:5.1f}s axe {" ".join(args)}', file=sys.stderr, flush=True)
        error = proc.stderr.strip() or proc.stdout.strip()
        if proc.returncode != 0 or proc.stdout.startswith('Error:'):
            raise AxeError(f'axe {" ".join(args)} failed: {error}')
        return proc.stdout

    def state(self):
        def walk(node):
            if isinstance(node, dict):
                yield node
                for child in node.get('children', []):
                    yield from walk(child)
            elif isinstance(node, list):
                for child in node:
                    yield from walk(child)

        try:
            tree = self.axe('describe-ui')
        except AxeError as error:
            if TRANSITION_ERROR in str(error):
                raise Transition(str(error)) from None
            raise
        return list(walk(json.loads(tree)))

    def read(self, timeout=30):
        previous = None

        def check(items):
            nonlocal previous
            ids = sorted(i.get('AXUniqueId') or '' for i in items)
            stable = items if ids == previous else None
            previous = ids
            return stable

        return self.wait(check, 'accessibility tree never settled', timeout)

    def wait(self, predicate, message, timeout=30):
        deadline = time.monotonic() + timeout
        while time.monotonic() < deadline:
            try:
                items = self.state()
            except Transition:
                print('        describe-ui: no accessibility tree during a transition', file=sys.stderr, flush=True)
                items = []
            result = predicate(items) if items else None
            if result:
                return result
            time.sleep(0.2)  # polling interval, not an assertion
        raise AssertionError(message)

    def settled(self, match, message, timeout=30):
        previous = None

        def check(items):
            nonlocal previous
            found = match(items)
            current = found.get('frame') if found else None
            stable = found if current is not None and current == previous else None
            previous = current
            return stable

        return self.wait(check, message, timeout)

    def gone(self, identifier, timeout=30):
        self.wait(lambda items: all(i.get('AXUniqueId') != identifier for i in items),
                  f'{identifier} is still on screen', timeout)

    def element(self, identifier, timeout=30):
        return self.wait(
            lambda items: next((i for i in items if i.get('AXUniqueId') == identifier), None),
            f'Missing {identifier}',
            timeout,
        )

    def labelled(self, label, timeout=30):
        return self.wait(
            lambda items: next((i for i in items if i.get('AXLabel') == label), None),
            f'Missing element labelled {label}',
            timeout,
        )

    def wait_label(self, identifier, predicate, message, timeout=30):
        return self.wait(
            lambda items: next(
                (i for i in items if i.get('AXUniqueId') == identifier and predicate(i.get('AXLabel') or '')),
                None,
            ),
            message,
            timeout,
        )

    # A target found during a push, pop or sheet transition is still moving, and a tap at its
    # activation point can land beside it; tap only once two reads give the same frame.
    def tap(self, identifier):
        self.settled(lambda items: next((i for i in items if i.get('AXUniqueId') == identifier), None),
                     f'{identifier} never settled')
        self.axe('tap', '--id', identifier, '--post-delay', '0.5')

    def tap_label(self, label):
        self.settled(lambda items: next((i for i in items if i.get('AXLabel') == label), None),
                     f'element labelled {label} never settled')
        self.axe('tap', '--label', label, '--post-delay', '0.5')

    def tap_point(self, x, y):
        self.axe('tap', '-x', str(round(x)), '-y', str(round(y)), '--post-delay', '0.5')

    def swipe(self, start, end, duration=0.5):
        self.axe('swipe', '--start-x', str(round(start[0])), '--start-y', str(round(start[1])),
                 '--end-x', str(round(end[0])), '--end-y', str(round(end[1])), '--duration', str(duration))

    def type(self, text):
        if all(char in HID_KEYCODES for char in text):
            self.axe('key-sequence', '--keycodes', ','.join(HID_KEYCODES[char] for char in text), '--delay', '0.08')
        else:
            self.axe('type', text)

    def backspace(self, times):
        self.axe('key-sequence', '--keycodes', ','.join(['42'] * times))

    def capture(self, name):
        subprocess.run(
            ['xcrun', 'simctl', 'io', self.udid, 'screenshot', str(self.output / f'{name}.png')],
            check=True, timeout=20, capture_output=True,
        )
        (self.output / f'{name}.json').write_text(self.axe('describe-ui'))
        return self.output / f'{name}.png'

    def frame_bytes(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'f.png'
            subprocess.run(['xcrun', 'simctl', 'io', self.udid, 'screenshot', str(path)],
                           check=True, timeout=20, capture_output=True)
            return path.read_bytes()

    def at_rest(self, message='the screen never came to rest', timeout=90, gap=1.0):
        deadline = time.monotonic() + timeout
        previous = None
        while time.monotonic() < deadline:
            try:
                current = self.frame_bytes()
            except subprocess.TimeoutExpired:
                previous = None
                continue
            if current == previous:
                return
            previous = current
            time.sleep(gap)  # frame spacing, not an assertion
        raise AssertionError(message)

    def snap(self, name):
        path = self.capture(name)
        points = json.loads((self.output / f'{name}.json').read_text())[0]['frame']['width']
        return Shot(path, points)


def sign_in_apple(ui):
    ui.element('sign-in-apple')
    ui.at_rest()
    ui.tap('sign-in-apple')


def reach_home(ui):
    if '-uiVerifySignedIn' in ui.launch_args:
        ui.element('home-scroll')
        return
    sign_in_apple(ui)
    ui.wait(lambda items: any(i.get('AXUniqueId') == 'name-input' and i.get('AXValue') for i in items),
            'name not prefilled from the fixture profile')
    ui.tap('name-continue')
    ui.tap('language-done')
    ui.element('home-scroll')


def by_id(items, identifier):
    return next((i for i in items if i.get('AXUniqueId') == identifier), None)


def bottom(element):
    return element['frame']['y'] + element['frame']['height']


TABS = ['tab-bounty', 'tab-ride', 'tab-messages', 'tab-me']
ACCESSORIES = ('urgent-accessory', 'urgent-accessory-inline')


def selected(items):
    return [t for t in TABS if str((by_id(items, t) or {}).get('AXValue')) == '1']


def accessory(items):
    return next((by_id(items, a) for a in ACCESSORIES if by_id(items, a)), None)


def tab(items, label):
    return next((i for i in items if i.get('type') == 'RadioButton' and i.get('AXLabel') == label), None)


def nav_bar(items, ui):
    title = ui.t('shell.home.title')
    return next((i for i in items if i.get('type') == 'Group' and i.get('AXUniqueId') == title), None)


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


def luma(rgb):
    r, g, b = rgb
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


class Shot:
    def __init__(self, png_path, points_wide):
        self.path = Path(png_path)
        with tempfile.TemporaryDirectory() as tmp:
            bmp = Path(tmp) / 'shot.bmp'
            subprocess.run(['sips', '-s', 'format', 'bmp', str(self.path), '--out', str(bmp)],
                           check=True, capture_output=True, timeout=20)
            data = bmp.read_bytes()
        offset = struct.unpack('<I', data[10:14])[0]
        width, height = struct.unpack('<ii', data[18:26])
        assert struct.unpack('<H', data[28:30])[0] == 32, f'{self.path} did not convert to 32-bit BMP'
        self.data, self.offset, self.width, self.height = data, offset, width, abs(height)
        self.top_down = height < 0
        self.scale = width / points_wide

    def _px(self, x, y):
        row = y if self.top_down else self.height - 1 - y
        i = self.offset + (row * self.width + x) * 4
        return self.data[i + 2], self.data[i + 1], self.data[i]

    def rgb(self, x, y):
        return self._px(min(self.width - 1, round(x * self.scale)), min(self.height - 1, round(y * self.scale)))

    def pixels(self, f, pad=0):
        x0 = max(0, round((f['x'] - pad) * self.scale))
        y0 = max(0, round((f['y'] - pad) * self.scale))
        x1 = min(self.width, round((f['x'] + f['width'] + pad) * self.scale))
        y1 = min(self.height, round((f['y'] + f['height'] + pad) * self.scale))
        for y in range(y0, y1):
            for x in range(x0, x1):
                yield self._px(x, y)

    def count(self, f, predicate, pad=0):
        return sum(1 for rgb in self.pixels(f, pad) if predicate(rgb))


def glow(shot, f, background, pad=4):
    floor = luma(background) + 12
    whitest = min(background) + 12
    ink = shot.count(f, lambda rgb: luma(rgb) < 90, pad)
    light = shot.count(f, lambda rgb: luma(rgb) > floor and min(rgb) > whitest, pad)
    return ink, light


def token(name, appearance):
    source = (Path(__file__).resolve().parents[2] / 'src/ui/theme/tokens.ts').read_text()
    light, _, dark = source.partition('export const darkVars')
    pattern = re.compile(rf"'{re.escape(name)}': '#([0-9A-Fa-f]{{6}})'")
    found = (pattern.search(dark) if appearance == 'dark' else None) or pattern.search(light)
    assert found, f'token {name} not found'
    return tuple(int(found.group(1)[i:i + 2], 16) for i in (0, 2, 4))


def dominant(shot, f):
    counts = {}
    for rgb in shot.pixels(f):
        counts[rgb] = counts.get(rgb, 0) + 1
    assert counts, f'region {f} is off screen'
    return max(counts, key=counts.get)


def close(a, b, tolerance=6):
    return max(abs(x - y) for x, y in zip(a, b)) <= tolerance


def assert_colour(shot, f, expected, name, tolerance=6):
    found = dominant(shot, f)
    assert close(found, expected, tolerance), f'{name} is {found}, expected {expected}'


def assert_tapir_button(shot, f, appearance, name):
    snout = {**f, 'width': f['width'] * 0.4}
    outline = shot.count(snout, lambda rgb: luma(rgb) > 235)
    ink = shot.count(f, lambda rgb: luma(rgb) < 60)
    glass = luma(dominant(shot, f))
    print(f'{name}: glass luma {glass:.0f}, {outline} white snout-outline pixels, {ink} ink pixels')
    if appearance == 'dark':
        assert glass < 80, f'{name}: button glass is light ({glass:.0f}) in dark appearance'
        assert outline > 150, f'{name}: no white outline around the head on dark glass ({outline} pixels)'
    else:
        assert glass > 175, f'{name}: button glass is dark ({glass:.0f}) in light appearance'
        assert ink > 800, f'{name}: the head ink is missing ({ink} pixels)'


CARD_FILL = {
    'oweMoney': '--color-card-pay',
    'rideSoon': '--color-card-ride',
    'owedToYou': '--color-card-progress',
    'bountyInProgress': '--color-card-progress',
    'calm': '--color-card-calm',
}
STAGES = ('urgent', 'live', 'calm')


def corner(f, size=8):
    return {'x': f['x'] + 2, 'y': f['y'] + 2, 'width': size, 'height': size}


def card_fill(f):
    return {'x': f['x'] + 2, 'y': f['y'] + f['height'] * 0.35, 'width': 10, 'height': f['height'] * 0.3}


def assert_home(ui, name, stage, cards):
    reach_home(ui)
    found = ui.settled(lambda items: by_id(items, f'home-stage-{stage}'), f'home-stage-{stage} missing')
    front = ui.settled(lambda items: by_id(items, f'live-card-{cards[0]}'), f'front card {cards[0]} missing')
    items = ui.read()
    others = [s for s in STAGES if s != stage and by_id(items, f'home-stage-{s}')]
    assert not others, f'other stages shown: {others}'
    assert found.get('AXLabel'), f'home-stage-{stage} has no line'
    for kind in CARD_FILL:
        if kind != cards[0]:
            assert by_id(items, f'live-card-{kind}') is None, f'live-card-{kind} shown in front while stacked'
    peeks = [p for p in ('live-card-peek-1', 'live-card-peek-2') if by_id(items, p)]
    assert len(peeks) == min(2, len(cards) - 1), f'{len(cards)} cards show peeks {peeks}'
    toggle = by_id(items, 'live-cards-toggle')
    if len(cards) > 1:
        expected = ui.t('home.stack.fanOut', count=len(cards))
        assert toggle and toggle.get('AXLabel') == expected, f'toggle reads {toggle and toggle.get("AXLabel")}, not {expected}'
    else:
        assert toggle is None, 'a single card shows the stack toggle'
    for element in (found, front):
        f = element['frame']
        assert f['x'] >= 0 and f['x'] + f['width'] <= items[0]['frame']['width'], f'{element["AXUniqueId"]} overflows: {f}'
    shot = ui.snap(name)
    assert_colour(shot, corner(found['frame']), token(f'--color-stage-{stage}', ui.appearance), f'{stage} stage')
    assert_colour(shot, card_fill(front['frame']), token(CARD_FILL[cards[0]], ui.appearance), f'{cards[0]} card')
    return items
