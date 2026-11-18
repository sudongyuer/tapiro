import json
import time

from choose import defaults
from driver import by_id, close, luma
from taps import walk

# One word: a typed space was turned into 「. 」 once (en dark). Lower case, so it goes through paced HID keys: an
# unpaced `axe type Parcel` left iOS's press-and-hold accent menu for 「l」 over the field in 2 of 32 probes, and
# the menu swallowed the press on 发送 (2026-11-16).
TYPED = 'parcel'


def ai_calls(ui, name, count, timeout=10):
    deadline = time.monotonic() + timeout
    while True:
        found = [call['args'] for call in json.loads(defaults(ui, 'uiVerifyAiCalls') or '[]') if call['name'] == name]
        if len(found) >= count or time.monotonic() >= deadline:
            return found
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously


def assert_calls(ui, name, count, wait=3):
    ai_calls(ui, name, count, timeout=15)
    time.sleep(wait)  # a replay would follow the answer
    found = ai_calls(ui, name, count + 1, timeout=1)
    assert len(found) == count, f'{name} was called {len(found)} times, expected {count}: {found}'
    return found


def open_sheet(ui):
    ui.tap('tab-ask-tapir')
    ui.settled(lambda items: by_id(items, 'ask-tapir-sheet'), 'ask sheet never settled')


def prompt_value(ui):
    return (by_id(ui.read(), 'ask-tapir-prompt') or {}).get('AXValue') or ''


def focus_prompt(ui):
    ui.tap('ask-tapir-prompt')
    ui.wait(lambda items: any(i.get('AXUniqueId') == 'Return' for i in items) or None,
            'no keyboard after the tap on the prompt', 5)


def type_and_send(ui, text=TYPED):
    if prompt_value(ui) != text:
        focus_prompt(ui)
        ui.type(text)
        ui.wait(lambda items: (by_id(items, 'ask-tapir-prompt') or {}).get('AXValue') == text,
                f'the prompt never read {text}')
        ui.at_rest()  # the keyboard lifts the sheet to its full detent; a tap during that move landed nowhere (en dark)
    # An instant AXe tap on 发送 with the keyboard up was dropped 3 times in en dark (frame checked); a finger-length
    # press lands, as for the SwiftUI switches.
    ui.press('ask-tapir-send', 0.15)


def said(items, identifier):
    parts = [(by_id(items, name) or {}).get('AXLabel') or '' for name in (identifier, f'{identifier}-rest')]
    return ''.join(''.join(parts).split())


def wait_said(ui, identifier, key, timeout=30):
    expected = ''.join(ui.t(key).split())
    ui.wait(lambda items: said(items, identifier) == expected, f'{identifier} does not read {ui.t(key)}', timeout)


def note(ui, key, timeout=30):
    wait_said(ui, 'ask-tapir-note', key, timeout)


def captured(ui, name):
    return list(walk(json.loads((ui.output / f'{name}.json').read_text())))


def lift(shot, f):
    band = {'y': f['y'] + f['height'] * 0.3, 'height': f['height'] * 0.4, 'width': 5}

    def middle(x):
        shades = sorted(luma(rgb) for rgb in shot.pixels({**band, 'x': x}))
        return shades[len(shades) // 2]

    return middle(f['x'] + 3) - middle(f['x'] - 9)


# On the audit's captures an unfilled card read 0.9 (light) and 4.0 (dark), a dark card on the opaque background -13.8
# to 4.1, and a filled light chip 14 to 33 (2026-11-17).
def assert_lifted(shot, f, name, least=8):
    found = lift(shot, f)
    print(f'{name}: {found:.1f} brighter than the sheet beside it')
    assert found >= least, f'{name} is only {found:.1f} brighter than the sheet beside it: it has no fill of its own'


SYSTEM_GREEN = {'light': (52, 199, 89), 'dark': (48, 209, 88)}


def assert_switch_green(shot, f, name, appearance):
    end = {**f, 'x': f['x'] + f['width'] - 70, 'width': 70}
    track = [rgb for rgb in shot.pixels(end) if rgb[1] > rgb[0] + 60 and rgb[1] > rgb[2] + 60]
    assert len(track) >= 300, f'{name} is on without a green track ({len(track)} green pixels)'
    found = max(set(track), key=track.count)
    assert close(found, SYSTEM_GREEN[appearance], 12), f'{name} is on in {found}, not the system green'


def footer(ui, text, timeout=30):
    ui.wait_label('tapir-cloud-footer', lambda label: label == text, f'the footer is not {text}', timeout=timeout)


def toggle_on(items):
    toggle = by_id(items, 'tapir-cloud')
    return None if toggle is None else str(toggle.get('AXValue')) == '1'


def turn(ui, index, timeout=30):
    return ui.element(f'ask-turn-{index}', timeout=timeout)


def close_button(ui, items=None):
    label = ui.t('shell.ask.close')
    return next((i for i in (items or ui.read()) if i.get('AXLabel') == label and i.get('type') == 'Button'), None)


# The sheet's own header rests in the system bar's row, left of its close button, and scrolled content passes under
# that bar (its scroll edge effect) while the close button stays where it was.
def header_drop(ui):
    items = ui.read()
    button = close_button(ui, items)
    assert button, 'the 问小貘 sheet has no system close button'
    belly = by_id(items, 'ask-belly')['frame']
    assert button['frame']['x'] > belly['x'] + belly['width'], f'the close button is not at the trailing end: {button["frame"]}'
    return button['frame']


def assert_scrolled_under_bar(ui, rest):
    items = ui.read()
    button, belly = close_button(ui, items), by_id(items, 'ask-belly')
    assert button and button['frame'] == rest, f'the close button moved with the content: {button and button["frame"]}'
    assert belly is None or belly['frame']['y'] < rest['y'] + rest['height'], \
        f'the belly bar did not scroll under the bar: {belly and belly["frame"]}'


def ink_centre(shot, f, inked):
    x0, x1 = round(f['x'] * shot.scale), round((f['x'] + f['width']) * shot.scale)
    y = round((f['y'] + f['height'] / 2) * shot.scale)
    found = [x for x in range(x0, x1) for dy in range(-12, 13, 3) if inked(shot._px(x, y + dy))]
    assert found, f'no ink of that colour in {f}'
    return (min(found) + max(found)) / 2 / shot.scale


def failure(ui, reason, key, timeout=30):
    ui.element(f'ask-failure-{reason}', timeout=timeout)
    wait_said(ui, 'ask-failure-text', key)


def ask_texts(ui, count, wait=3):
    return [call['text'] for call in assert_calls(ui, 'ask', count, wait=wait)]


def close_sheet(ui):
    ui.tap_label(ui.t('shell.ask.close'))
    ui.gone('ask-tapir-sheet')
