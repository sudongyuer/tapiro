"""Worst-case images (break-ui): a 410×2048 photo from the other side is cropped to a 1:3 bubble, a 2048×400 one of
yours to 3:1, a 24×24 image is drawn as a 72 pt square (not blown up to the full width, still tappable), and a
landscape photo keeps 4:3; every bubble stays inside the screen with its side's margin, theirs on the left and yours on
the right, and each visible one shows its picture. Dark covers the placeholder and bubble colours."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import drawn, open_thread, within_screen  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyFixture', 'worst', '-uiVerifyChatImages', '1']
NAME = 'Nurul Aisyah binti Mohd Rahman Abdullah Hj. Kamaruddin'
SHAPES = {
    'fixture-chat-worst-m3': ('theirs', 1 / 3),
    'fixture-chat-worst-c4': ('mine', 3),
    'fixture-chat-worst-m5': ('theirs', 1),
    'fixture-chat-worst-c6': ('mine', 4 / 3),
}

ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-worst', NAME)
items = ui.wait(lambda items: all(by_id(items, f'chat-bubble-{key}-image') for key in SHAPES) and items,
                'not every worst-case image loaded', 45)
ui.at_rest()
items = ui.read()
shot = ui.snap('01-images')
width = items[0]['frame']['width']
card = by_id(items, 'chat-item-card')['frame']
composer = by_id(items, 'chat-composer-input')['frame']
shown = 0
for key, (side, ratio) in SHAPES.items():
    bubble = by_id(items, f'chat-bubble-{key}')
    f = bubble['frame']
    within_screen(items, bubble)
    assert abs(f['width'] / f['height'] - ratio) < 0.06, f'{key} is {f["width"]}×{f["height"]}, not {ratio:.2f}:1'
    assert min(f['width'], f['height']) >= 44, f'{key} is smaller than a tap target: {f}'
    if side == 'mine':
        assert f['x'] + f['width'] >= width - 24 and f['x'] > 60, f'{key} is not on the right: {f}'
    else:
        assert f['x'] <= 24 and f['x'] + f['width'] < width - 60, f'{key} is not on the left: {f}'
    if f['y'] >= card['y'] + card['height'] and f['y'] + f['height'] <= composer['y'] - 8:
        drawn(shot, f, 60)
        shown += 1
tiny = by_id(items, 'chat-bubble-fixture-chat-worst-m5')['frame']
assert round(tiny['width']) == 72, f'the 24×24 image is not a 72 pt square: {tiny}'
assert shown >= 2, f'only {shown} worst-case images are on screen to check'
print(f'PASS: tall and wide crop to 3:1, tiny stays 72 pt, landscape keeps 4:3, all inside the screen ({shown} drawn)')
