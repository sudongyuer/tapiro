"""Stored images (124 A): the 消息 row whose last message is a photo reads 「[图片]」; in the thread 阿杰's photo shows at
its shape; a tap opens it in the system viewer (Quick Look: full screen, zoom, the system's own close), and closing it
returns to the thread. A long press offers 复制 and 举报 (no text to copy, so 复制 copies the picture); 举报 opens the
report sheet quoting the message as 「[图片]」. Dark covers the bubble and the viewer."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import drawn, open_list  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
LOCALES = ['zh-Hans', 'en']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyChatImages', '1']
PHOTO = 'chat-bubble-fixture-chat-bounty-m4'

ui = UI(*sys.argv[1:])
open_list(ui)
row = ui.element('chat-row-fixture-chat-bounty')
assert ui.t('chat.list.image') in (row.get('AXLabel') or ''), f'the row does not read the photo: {row.get("AXLabel")}'

ui.tap('chat-row-fixture-chat-bounty')
ui.labelled('阿杰')
ui.gone('chat-list')
ui.element(f'{PHOTO}-image', timeout=30)
items = ui.read()
photo = by_id(items, PHOTO)
f = photo['frame']
assert abs(f['height'] / f['width'] - 2048 / 1536) < 0.05, f'the photo lost its shape: {f}'
assert photo.get('AXLabel') == ui.t('chat.list.from', name='阿杰', body=ui.t('chat.thread.image')) or \
    photo.get('AXLabel') == ui.t('chat.list.mine', body=ui.t('chat.thread.image')), photo.get('AXLabel')
ui.at_rest()
drawn(ui.snap('01-thread'), f)

ui.tap(PHOTO)
items = ui.wait(lambda items: not by_id(items, 'chat-composer-input') and items, 'the viewer never covered the thread')
ui.at_rest()
shot = ui.snap('02-viewer')
screen = items[0]['frame']
middle = {'x': 0, 'y': screen['height'] * 0.3, 'width': screen['width'], 'height': screen['height'] * 0.4}
drawn(shot, middle, 2000)


def close_button(items):
    return next((i for i in items if i.get('type') == 'Button' and i['frame']['y'] < 140), None)


# Quick Look may open with its bars hidden; a tap on the picture shows them, as on a device.
if not close_button(items):
    ui.tap_point(screen['width'] / 2, screen['height'] / 2)
close = ui.wait(close_button, 'the viewer shows no close button in its bar', 15)
ui.capture('02b-viewer-bars')
ui.tap_point(close['frame']['x'] + close['frame']['width'] / 2, close['frame']['y'] + close['frame']['height'] / 2)
ui.element('chat-composer-input', timeout=20)

ui.at_rest()
ui.press(PHOTO, 1.2)
ui.labelled(ui.t('chat.thread.copy'))
ui.labelled(ui.t('chat.thread.report'))
ui.at_rest()
ui.capture('03-menu')
ui.tap_label(ui.t('chat.thread.report'))
ui.element('chat-report', timeout=20)
quote = ui.element('chat-report-quote')
assert quote.get('AXLabel') == ui.t('chat.list.image'), quote
ui.capture('04-report')
print('PASS: row reads [图片], photo keeps its shape, opens in the system viewer and closes, menu 复制/举报, quote [图片]')
