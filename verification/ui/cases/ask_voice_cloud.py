"""When no on-device engine can transcribe, 问小貘 still listens (a red 停, the field says it will write the words down
after); 停 brings the consent page before the recording leaves the phone (130 A), and after 同意 the words are written
down after what was typed. Only the recording is sent, once; nothing is sent to 小貘 until the user taps 发送."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import ai_calls, assert_calls, open_sheet  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskTapirSheet.tsx', 'src/features/shell/AskInput.tsx', 'src/app/ask.tsx',
        'src/app/ask-consent.tsx', 'src/lib/i18n/locales/ask/', 'verification/ui/ask.py']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'none',
        '-uiVerifyAiDelayMs', '2500', '-uiVerifyVoice', 'granted', '-uiVerifyVoiceEngine', 'cloud']

WORDS = {'zh-Hans': '明天帮我去 Pyramid 取快递', 'en': 'Pick up my parcel at Pyramid tomorrow',
         'ms': 'Tolong ambil bungkusan saya di Pyramid esok'}

ui = UI(*sys.argv[1:])
reach_home(ui)
open_sheet(ui)
ui.tap('ask-tapir-mic')
ui.wait_label('ask-tapir-mic', lambda label: label == ui.t('ask.voice.stop'), 'the mic did not turn into 停')
assert by_id(ui.read(), 'ask-voice-explain') is None, 'the card showed although both permissions were granted'
assert ai_calls(ui, 'speechRequestPermissions', 1, timeout=1) == [], 'granted permissions were asked again'
ui.wait(lambda items: (by_id(items, 'ask-tapir-prompt') or {}).get('AXValue') == ui.t('ask.voice.listeningCloud'),
        'the field does not say the words are written down after 停', timeout=10)
ui.capture('01-listening-cloud')

ui.tap('ask-tapir-mic')
ui.element('ask-consent-screen', timeout=30)
assert ai_calls(ui, 'transcribe', 1, timeout=1) == [], 'the recording left before consent'
ui.at_rest()
ui.capture('02-consent-before-upload')

ui.tap('ask-consent-agree')
ui.gone('ask-consent-screen', timeout=30)
ui.element('ask-tapir-transcribing', timeout=10)
ui.capture('03-transcribing')
ui.wait(lambda items: (by_id(items, 'ask-tapir-prompt') or {}).get('AXValue') == WORDS[ui.locale],
        'the written-down words never filled the field')
assert assert_calls(ui, 'transcribe', 1) == [{'language': ui.locale, 'audio': True}]
assert_calls(ui, 'ask', 0, wait=1)
ui.element('ask-tapir-send')
ui.at_rest()
ui.capture('04-written-down')
print('PASS: cloud listening asks consent before the recording leaves; the words fill the field and nothing else is sent')
