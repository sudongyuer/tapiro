# `axe type` sends keys with no delay; the SwiftUI TextField re-renders React on every change and dropped trailing
# keys in dark runs (2026-10-26), and an unpaced space repeated (「see you.      at the lobby」, 2026-11-10), so
# lower-case letters, digits and spaces go through paced key-sequence instead.
HID_KEYCODES = {
    **{chr(ord('a') + offset): str(4 + offset) for offset in range(26)},
    **{str(digit): str(29 + digit) for digit in range(1, 10)},
    '0': '39',
    ' ': '44',
}
# On iOS 27.2 the number, decimal and phone pads drop AXe's HID keys (6 of 6 after waits of 1.5 s, 2026-11-10) while
# taps on their keys land; the alphabetic keyboard, which lists its Return key in the accessibility tree, takes HID
# keys. The pads share one 3 x 4 grid, measured on the iPhone 17 Pro the runner uses.
PAD_COLUMNS = (1 / 6, 1 / 2, 5 / 6)
PAD_ROWS_FROM_BOTTOM = (254, 200.5, 146.5, 92)
PAD_KEYS = {**{str(digit): ((digit - 1) // 3, (digit - 1) % 3) for digit in range(1, 10)}, '0': (3, 1), '.': (3, 0)}
PAD_DELETE = (3, 2)


def type_text(ui, text):
    assert text.isascii(), f'AXe types ASCII only; paste {text!r} with bounty.paste_into'
    if text and all(char in PAD_KEYS for char in text) and on_pad(ui):
        keypad(ui, text)
    elif all(char in HID_KEYCODES for char in text):
        ui.axe('key-sequence', '--keycodes', ','.join(HID_KEYCODES[char] for char in text), '--delay', '0.08')
    else:
        ui.axe('type', text)


def on_pad(ui):
    seen = []

    def check(items):
        seen.append(not any(i.get('AXUniqueId') == 'Return' for i in items))
        return len(seen) > 1 and seen[-1] == seen[-2] or None

    ui.wait(check, 'the keyboard never settled', 10)
    return seen[-1]


def keypad(ui, text):
    screen = ui.read()[0]['frame']
    for char in text:
        tap_pad_key(ui, screen, PAD_KEYS[char])


def tap_pad_key(ui, screen, key):
    row, column = key
    ui.tap_point(screen['width'] * PAD_COLUMNS[column], screen['height'] - PAD_ROWS_FROM_BOTTOM[row])


def backspace(ui, times):
    if on_pad(ui):
        screen = ui.read()[0]['frame']
        for _ in range(times):
            tap_pad_key(ui, screen, PAD_DELETE)
    else:
        ui.axe('key-sequence', '--keycodes', ','.join(['42'] * times))
