"""The first tap on the 问小貘 microphone shows a card that explains the microphone and speech recognition before any
system prompt (143 A); 好 asks once and listening starts. While listening the mic is a red 停 and the words appear in the
field as they are heard; 停 leaves the whole sentence in the field with 发送 beside it, and nothing is sent (142 A)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import ai_calls, assert_calls, open_sheet, prompt_value  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskTapirSheet.tsx', 'src/features/shell/AskInput.tsx', 'src/app/ask.tsx',
        'src/lib/i18n/locales/ask/', 'verification/ui/ask.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'none',
        '-uiVerifyVoice', 'undetermined', '-uiVerifyVoiceEngine', 'dictation']

WORDS = {'zh-Hans': '明天帮我去 Pyramid 取快递', 'en': 'Pick up my parcel at Pyramid tomorrow',
         'ms': 'Tolong ambil bungkusan saya di Pyramid esok'}

ui = UI(*sys.argv[1:])
words = WORDS[ui.locale]
reach_home(ui)
open_sheet(ui)
ui.wait_label('ask-tapir-mic', lambda label: label == ui.t('shell.ask.mic'), 'the mic is not 说话')

ui.tap('ask-tapir-mic')
ui.element('ask-voice-explain')
ui.wait_label('ask-voice-explain-title', lambda text: text == ui.t('ask.voice.explainTitle'), 'explain title is wrong')
ui.wait_label('ask-voice-explain-body', lambda text: text == ui.t('ask.voice.explainBody'), 'explain body is wrong')
items = ui.read()
for identifier in ('ask-voice-explain-button', 'ask-tapir-mic'):
    f = by_id(items, identifier)['frame']
    assert f['height'] >= 42, f'{identifier} is under 44 pt at the sheet scale: {f}'
assert ai_calls(ui, 'speechRequestPermissions', 1, timeout=1) == [], 'a system prompt came before the card'
ui.at_rest()
ui.capture('01-explain-card')

ui.tap('ask-voice-explain-button')
ui.gone('ask-voice-explain')
ui.wait_label('ask-tapir-mic', lambda label: label == ui.t('ask.voice.stop'), 'the mic did not turn into 停')


seen = []


def partial(items):
    shown = (by_id(items, 'ask-tapir-prompt') or {}).get('AXValue') or ''
    seen.append(shown)
    return shown != '' and shown != words and words.startswith(shown)


try:
    ui.wait(partial, 'no live words appeared while listening', timeout=10)
except AssertionError as error:
    raise AssertionError(f'{error}; the field read {seen}') from None
assert by_id(ui.read(), 'ask-tapir-send') is None, '发送 showed while listening'
ui.capture('02-listening-live')
assert len(ai_calls(ui, 'speechRequestPermissions', 1)) == 1, '好 did not ask for the permissions'
assert ai_calls(ui, 'speechStart', 1) == [{'language': ui.locale}], 'listening did not start in the app language'

ui.wait(lambda items: (by_id(items, 'ask-tapir-prompt') or {}).get('AXValue') == words, 'the sentence never filled in')
ui.tap('ask-tapir-mic')
ui.wait_label('ask-tapir-mic', lambda label: label == ui.t('shell.ask.mic'), 'the mic did not go back to 说话')
assert prompt_value(ui) == words, f'stopping changed the words: {prompt_value(ui)!r}'
ui.element('ask-tapir-send')
assert_calls(ui, 'ask', 0, wait=2)
assert ai_calls(ui, 'transcribe', 1, timeout=1) == [], 'an on-device transcript went to the cloud'
ui.at_rest()
ui.capture('03-stopped-filled')
print('PASS: the card explains before the prompt; live words while listening; 停 leaves the sentence and sends nothing')
