"""Loading states of a stored image: while the picture downloads (the fixture holds it 12 s) the bubble is the
placeholder at the photo's shape and reads 「正在加载图片」; the first download fails (`-uiVerifyChatFail image`), so it
shows a retry mark and reads 「图片没加载出来，点一下重试」, never an empty or blank bubble that looks loaded, and it does
not retry on its own; a tap loads it again and the picture appears. Runs ms for the longest copy."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import chat_calls, drawn, open_thread  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyChatImages', '1', '-uiVerifyChatFail', 'image', '-uiVerifyChatImageDelay', '12000']
PHOTO = 'chat-bubble-fixture-chat-bounty-m4'

ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', '阿杰')
spoken = ui.t('chat.list.from', name='阿杰', body=ui.t('chat.thread.image'))
if not (by_id(ui.read(), PHOTO) or {}).get('AXLabel', '').startswith(spoken):
    spoken = ui.t('chat.list.mine', body=ui.t('chat.thread.image'))
loading = ui.t('chat.thread.a11yImageState', label=spoken, state=ui.t('chat.thread.imageLoading'))
failed = ui.t('chat.thread.a11yImageState', label=spoken, state=ui.t('chat.thread.imageFailed'))
photo = ui.wait_label(PHOTO, lambda label: label == loading, 'the photo never read as loading', 10)
f = photo['frame']
assert abs(f['height'] / f['width'] - 2048 / 1536) < 0.05, f'the placeholder lost the photo shape: {f}'
ui.capture('01-loading')
ui.wait_label(PHOTO, lambda label: label == failed, 'the failed download never said so', 30)
assert not by_id(ui.read(), f'{PHOTO}-image'), 'a failed photo shows a picture'
ui.at_rest()
ui.capture('02-failed')
time.sleep(3)  # the preferences file can lag behind and still hold the previous launch's calls
loads = len(chat_calls(ui, 'imageFile', 1, 0))
time.sleep(5)
assert len(chat_calls(ui, 'imageFile', 1, 0)) == loads, 'the failed photo was downloaded again on its own'

ui.tap(PHOTO)
ui.element(f'{PHOTO}-image', timeout=40)
assert by_id(ui.read(), PHOTO).get('AXLabel') == spoken, 'the loaded photo still reads a state'
ui.at_rest()
drawn(ui.snap('03-loaded'), by_id(ui.read(), PHOTO)['frame'])
print('PASS: placeholder at the photo shape while loading, failure says so and waits for a tap, tap loads it')
