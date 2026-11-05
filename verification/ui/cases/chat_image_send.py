"""Sending a photo (124 A, drawn on the canvas): the ＋ left of the composer opens a system menu with 照片 and 拍照;
照片 (the system picker, replaced at the device boundary) sends the picked photo at once as its own message. While the
upload and send are outstanding (the fixture holds the send for 6 s) the image bubble shows the local photo at its
shape with the spinner beside it, as text bubbles do; once stored the spinner goes and the bubble keeps the picture.
The send carries the path derived from the client id, and the typed draft stays in the composer."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, chat_calls, drawn, open_thread, pick_image  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
LOCALES = ['zh-Hans', 'ms']
DRAFT = '等一下'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyChatPick', 'photo', '-uiVerifyChatSendDelay', '6000',
        '-uiVerifyChatDraft', 'fixture-chat-bounty|等一下']


def spinners(items):
    return [i for i in items if (i.get('AXUniqueId') or '').startswith('chat-sending-')]


ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', '阿杰')
attach = ui.element('chat-composer-attach')
assert attach.get('AXLabel') == ui.t('chat.thread.attach'), attach.get('AXLabel')
assert_touch_target(attach, 'the ＋ button')
field = ui.element('chat-composer-input')
assert attach['frame']['x'] + attach['frame']['width'] <= field['frame']['x'] + 1, 'the ＋ is not left of the field'

ui.tap('chat-composer-attach')
ui.labelled(ui.t('chat.thread.photo'))
ui.labelled(ui.t('chat.thread.camera'))
ui.at_rest()
ui.capture('01-menu')
ui.tap_label(ui.t('chat.thread.photo'))

mine = ui.t('chat.list.mine', body=ui.t('chat.thread.image'))
sending = ui.t('chat.thread.a11ySending', label=mine)
items = ui.wait(lambda items: any(b.get('AXLabel') == sending for b in bubbles(items)) and spinners(items) and items,
                'the photo bubble shows no spinner while sending', 20)
bubble = next(b for b in bubbles(items) if b.get('AXLabel') == sending)
f = bubble['frame']
assert abs(f['height'] / f['width'] - 2048 / 1536) < 0.05, f'the bubble lost the photo shape: {f}'
assert (by_id(items, 'chat-composer-input') or {}).get('AXValue') == DRAFT, 'sending a photo cleared the draft'
shot = ui.snap('02-sending')
drawn(shot, f)
[spinner] = spinners(items)
assert spinner['frame']['x'] + spinner['frame']['width'] <= f['x'] + 1, 'the spinner is not beside the photo'

[call] = chat_calls(ui, 'send', 1)
assert call['body'] == '' and call['image'] == f"fixture-chat-bounty/00000000-0000-4000-8000-000000000001/{call['clientId']}.jpg", call
ui.wait(lambda items: any(b.get('AXLabel') == mine for b in bubbles(items)) and not spinners(items),
        'the photo never turned stored', 20)
items = ui.read()
stored = next(b for b in bubbles(items) if b.get('AXLabel') == mine)
assert by_id(items, f"{stored['AXUniqueId']}-image"), 'the stored photo lost its picture'
ui.at_rest()
shot = ui.snap('03-stored')
drawn(shot, stored['frame'])
print('PASS: ＋ menu, photo sends at once with a spinner, keeps its shape and picture once stored, draft kept')
