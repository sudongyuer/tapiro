import json
import time

from choose import defaults
from driver import by_id

TYPED = 'Parcel'  # one word: a typed space was turned into 「. 」 once (en dark)


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


def type_and_send(ui, text=TYPED):
    if prompt_value(ui) != text:
        ui.tap('ask-tapir-prompt')
        ui.type(text)
        ui.wait(lambda items: (by_id(items, 'ask-tapir-prompt') or {}).get('AXValue') == text,
                f'the prompt never read {text}')
        ui.at_rest()  # the keyboard lifts the sheet to its full detent; a tap during that move landed nowhere (en dark)
    # An instant AXe tap on 发送 with the keyboard up was dropped 3 times in en dark (frame checked); a finger-length
    # press lands, as for the SwiftUI switches.
    ui.press('ask-tapir-send', 0.15)


def note(ui, key, timeout=30):
    expected = ui.t(key)
    ui.wait_label('ask-tapir-note', lambda label: label == expected, f'the sheet note is not {expected}', timeout=timeout)


def footer(ui, text, timeout=30):
    ui.wait_label('tapir-cloud-footer', lambda label: label == text, f'the footer is not {text}', timeout=timeout)


def toggle_on(items):
    toggle = by_id(items, 'tapir-cloud')
    return None if toggle is None else str(toggle.get('AXValue')) == '1'
