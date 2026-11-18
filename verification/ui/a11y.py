import json
import re
import sys
from pathlib import Path

MIN_TARGET = 44
TOLERANCE = 0.5
FLOATING_INSET = 24
INTERACTIVE = ('Button', 'Link', 'TextField', 'TextArea', 'PopUpButton', 'CheckBox', 'RadioButton', 'Incrementor')
NAV_BARS = ('导航栏', 'Nav bar', 'Bar nav')
# Switches, steppers and menu pickers keep Apple's sizes inside a 44 pt row, and a SwiftUI text field takes focus only in
# its 22 pt text frame, so FieldRow makes the whole row focus it: for these the row is the target, not the frame.
SYSTEM_SIZED = ('CheckBox', 'Incrementor', 'PopUpButton', 'TextField', 'TextArea')
RAW_LABEL = re.compile(r'^[a-z][a-z0-9]*(?:[-_.][a-z0-9]+)+$')
# UIKit names context menu rows after their SF Symbol (`ellipsis`, `camera`); every Tapiro testID has two words or more.
TEST_ID = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)+$')


# iOS 26 draws a sheet at a lower detent as a floating card inset by the same margin on the left, right and bottom, and
# scales its content to the card's width: 44 pt buttons there report 42.2 pt on a 402 pt screen.
def floating_scale(frame, screen):
    if not frame or not screen:
        return None
    left = frame['x']
    right = screen['width'] - frame['x'] - frame['width']
    bottom = screen['height'] - frame['y'] - frame['height']
    if 0 < left <= FLOATING_INSET and abs(left - right) < 1 and abs(left - bottom) < 1:
        return frame['width'] / screen['width']
    return None


# VoiceOver stops on an interactive element and reads its children as part of it, so only the outermost one counts.
def elements(tree):
    def visit(node, chrome, inside, scale, screen):
        if not isinstance(node, dict):
            return
        own = node.get('AXUniqueId') or ''
        chrome = chrome or own.startswith('UIKeyboard') or node.get('role_description') in NAV_BARS \
            or node.get('type') == 'TabGroup'
        screen = screen or (node.get('frame') if node.get('type') == 'Application' else None)
        scale = floating_scale(node.get('frame'), screen) or scale
        if not inside:
            yield node, chrome, scale
        inside = inside or node.get('type') in INTERACTIVE
        for child in node.get('children') or []:
            yield from visit(child, chrome, inside, scale, screen)

    for root in tree if isinstance(tree, list) else [tree]:
        yield from visit(root, False, False, 1.0, None)


def where(node):
    f = node.get('frame') or {}
    ident = node.get('AXUniqueId')
    label = (node.get('AXLabel') or '').strip()
    named = ident or (repr(label[:40]) if label else 'unnamed')
    return f"{node.get('type')} {named} at ({f.get('x', 0):.0f}, {f.get('y', 0):.0f}) " \
           f"{f.get('width', 0):.0f}x{f.get('height', 0):.0f}"


def repeated(label):
    half = len(label) // 2
    return len(label) % 2 == 1 and label[half] == ' ' and label[:half] == label[half + 1:]


def ours(node):
    return bool(TEST_ID.match(node.get('AXUniqueId') or ''))


def too_small(node, scale=1.0):
    f = node.get('frame') or {}
    width, height = f.get('width', 0), f.get('height', 0)
    if width <= 0 or height <= 0:
        return False
    return min(width, height) / scale < MIN_TARGET - TOLERANCE


def problems(tree, allow=()):
    allowed = set(allow)
    found = []
    for node, chrome, scale in elements(tree):
        kind = node.get('type')
        if kind not in INTERACTIVE or (node.get('AXUniqueId') or '') in allowed:
            continue
        if chrome:
            continue
        label = (node.get('AXLabel') or '').strip()
        if not label:
            found.append(f'no VoiceOver label: {where(node)}')
        elif RAW_LABEL.match(label) or label == node.get('AXUniqueId'):
            found.append(f'label is an identifier, not words: {where(node)}')
        elif repeated(label):
            found.append(f'label says the same words twice (a field labelled with its own placeholder): {where(node)}')
        if not ours(node) or kind in SYSTEM_SIZED:
            continue
        if too_small(node, scale):
            found.append(f'touch target under {MIN_TARGET} pt: {where(node)}')
    return found


def assert_accessible(ui, name, allow=()):
    path = ui.output / f'{name}.json'
    found = problems(json.loads(path.read_text()), allow)
    assert not found, f'{name}: ' + '; '.join(found)
    print(f'{name}: every interactive element is labelled and at least {MIN_TARGET} pt')


def main(paths):
    failed = 0
    for path in paths:
        files = sorted(Path(path).rglob('*.json')) if Path(path).is_dir() else [Path(path)]
        for file in files:
            if file.name == 'result.json':
                continue
            try:
                tree = json.loads(file.read_text())
            except ValueError:
                continue
            for problem in problems(tree):
                failed += 1
                print(f'{file}: {problem}')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
