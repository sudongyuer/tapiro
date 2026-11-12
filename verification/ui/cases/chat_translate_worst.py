"""141 A failures, Task 5's hungry pattern: 小貘 dizzy under the message says nothing was charged and offers 再试一次 (a
tap, never automatic), which then translates; a hungry 小貘 says the message was not translated and offers 去喂小貘,
which opens 问小貘 on its hungry card. Nothing is retried on its own. Every button is at least 44 pt."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import assert_calls  # noqa: E402
from chat import bubbles, labels, open_thread  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/thread/', 'src/features/ask/', 'src/lib/translation.ts', 'src/app/(tabs)/messages/',
        'src/app/ask.tsx', 'src/lib/i18n/locales/chat/', 'verification/ui/chat.py', 'verification/ui/ask.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyAiReplies', 'providerError,answer,hungry', '-uiVerifyAiDelayMs', '800']
BUDGET = 240
FIRST, LAST = 'fixture-chat-bounty-m1', 'fixture-chat-bounty-m3'


def translate(ui, key):
    ui.press(f'chat-bubble-{key}', 1.2)
    ui.labelled(ui.t('chat.thread.copy'))
    ui.tap_label(ui.t('chat.thread.translate'))


def failed(ui, key, text_key, action):
    line = ui.element(f'chat-translate-failed-{key}', timeout=30)
    assert line.get('AXLabel') == ui.t(text_key), line.get('AXLabel')
    button = ui.element(f'chat-translate-{action}-{key}')
    assert button['frame']['height'] >= 44, f'{action} is under 44 pt: {button["frame"]}'
    width = ui.read()[0]['frame']['width']
    for found in (line, button):
        f = found['frame']
        assert f['x'] >= 0 and f['x'] + f['width'] <= width + 0.5, f'{found.get("AXUniqueId")} overflows: {f}'
    return button


ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', '阿杰')
ui.wait(lambda items: len(bubbles(items)) == 3, 'the demo thread never showed its messages')
ui.at_rest()
plain = by_id(ui.read(), f'chat-bubble-{FIRST}')['AXLabel']

translate(ui, FIRST)
failed(ui, FIRST, 'chat.translate.providerError', 'retry')
assert_calls(ui, 'translate', 1)
ui.at_rest()
ui.capture('01-dizzy')
ui.tap(f'chat-translate-retry-{FIRST}')
ui.wait_label(f'chat-bubble-{FIRST}', lambda label: label != plain and label.startswith(plain),
              'the retry did not translate')
ui.gone(f'chat-translate-failed-{FIRST}')
assert_calls(ui, 'translate', 2)

translate(ui, LAST)
feed = failed(ui, LAST, 'chat.translate.hungry', 'feed')
assert_calls(ui, 'translate', 3)
ui.at_rest()
ui.capture('02-hungry')
ui.tap(f'chat-translate-feed-{LAST}')
ui.settled(lambda items: by_id(items, 'ask-tapir-sheet'), 'the 问小貘 sheet never opened')
ui.element('ask-hungry-line', timeout=20)
assert ui.t('chat.thread.translate') not in labels(ui.read())
ui.at_rest()
ui.capture('03-sheet-hungry')
assert_calls(ui, 'translate', 3, wait=1)
print('PASS: dizzy offers 再试一次 and translates on the tap; hungry offers 去喂小貘, which opens the hungry card')
