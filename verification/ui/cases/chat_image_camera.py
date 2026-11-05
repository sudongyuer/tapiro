"""拍照 without camera access (124 A: the camera is asked for only when 拍照 is tapped): with the permission denied
(replaced at the device boundary, `-uiVerifyChatCamera denied`) 拍照 explains 「没有相机权限」 with 去设置 and 取消, and
sends nothing. The camera itself cannot run on the Simulator; taking a photo is a device check."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, open_thread, pick_image, tap_button  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyChatCamera', 'denied']

ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', '阿杰')
before = len(bubbles(ui.read()))
pick_image(ui, 'chat.thread.camera')
ui.labelled(ui.t('chat.thread.cameraDenied'))
ui.labelled(ui.t('chat.thread.cameraDeniedBody'))
ui.labelled(ui.t('chat.thread.openSettings'))
ui.at_rest()
ui.capture('01-denied')
tap_button(ui, ui.t('chat.thread.cancel'))
ui.wait(lambda items: ui.t('chat.thread.cameraDenied') not in [i.get('AXLabel') for i in items], 'the alert stayed')
assert len(bubbles(ui.read())) == before, 'a message appeared without a photo'
print('PASS: 拍照 without access explains and offers 去设置, sends nothing')
