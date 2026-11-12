"""A cloud transcription that fails says 小貘晕了 and that the words were not written down, offers 再转一次 and never
retries on its own; 再转一次 sends the same recording once and the words fill the field."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import ai_calls, assert_calls, open_sheet  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskInput.tsx', 'src/app/ask.tsx', 'src/lib/i18n/locales/ask/',
        'verification/ui/ask.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'given',
        '-uiVerifyAiDelayMs', '1500', '-uiVerifyAiReplies', 'providerError,answer',
        '-uiVerifyVoice', 'granted', '-uiVerifyVoiceEngine', 'cloud']

WORDS = {'zh-Hans': '明天帮我去 Pyramid 取快递', 'en': 'Pick up my parcel at Pyramid tomorrow',
         'ms': 'Tolong ambil bungkusan saya di Pyramid esok'}

ui = UI(*sys.argv[1:])
reach_home(ui)
open_sheet(ui)
ui.tap('ask-tapir-mic')
ui.wait_label('ask-tapir-mic', lambda label: label == ui.t('ask.voice.stop'), 'the mic did not turn into 停')
ui.tap('ask-tapir-mic')
ui.wait_label('ask-voice-note-text', lambda text: text == ui.t('ask.voice.note.failed'), 'no failure note')
ui.element('ask-voice-retry')
assert_calls(ui, 'transcribe', 1, wait=3)
assert by_id(ui.read(), 'ask-voice-retry')['frame']['height'] >= 42, '再转一次 is under 44 pt'
ui.at_rest()
ui.capture('01-failed')

ui.tap('ask-voice-retry')
ui.wait(lambda items: (by_id(items, 'ask-tapir-prompt') or {}).get('AXValue') == WORDS[ui.locale],
        'the retried words never filled the field')
assert len(ai_calls(ui, 'transcribe', 2)) == 2
assert by_id(ui.read(), 'ask-voice-note') is None, 'the failure note stayed after the retry'
assert_calls(ui, 'ask', 0, wait=1)
ui.at_rest()
ui.capture('02-retried')
print('PASS: a failed transcription offers 再转一次, never retries alone, and the retry fills the field')
