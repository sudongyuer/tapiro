"""China mainland storefront: long-pressing a message from the other side offers 复制 and 举报 but no 翻译."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, labels, open_thread  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/lib/storefront/', 'src/app/(tabs)/messages/[thread].tsx', 'src/features/chat/thread/',
        'verification/ui/chat.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyStorefront', 'CHN']
TITLE = '双威 → KLIA2'
ARIF = 'chat-bubble-fixture-chat-ride-m2'

ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-ride', TITLE)
ui.wait(lambda items: len(bubbles(items)) == 3, 'the ride thread never showed its messages')
ui.at_rest()
ui.press(ARIF, 1.2)
ui.labelled(ui.t('chat.thread.copy'))
items = ui.read()
assert ui.t('chat.thread.report') in labels(items), labels(items)
assert ui.t('chat.thread.translate') not in labels(items), '翻译 offered on the China mainland storefront'
ui.capture('01-menu')
print('PASS: no 翻译 on the China mainland storefront')
