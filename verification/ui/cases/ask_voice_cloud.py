"""When no on-device engine can transcribe, 问小貘 still listens (a red 停, the field says it will write the words down
after); 停 brings the consent page before the recording leaves the phone (130 A), and after 同意 the words are written
down after what was typed. Only the recording is sent, once; nothing is sent to 小貘 until the user taps 发送."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import ai_calls, assert_calls, captured, open_sheet  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402
from ocr import find, lines_in  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskTapirSheet.tsx', 'src/features/shell/AskInput.tsx', 'src/app/ask.tsx',
        'src/app/ask-consent.tsx', 'src/lib/i18n/locales/ask/', 'verification/ui/ask.py']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'none',
        '-uiVerifyAiDelayMs', '8000', '-uiVerifyVoice', 'granted', '-uiVerifyVoiceEngine', 'cloud']

WORDS = {'zh-Hans': '明天帮我去 Pyramid 取快递', 'en': 'Pick up my parcel at Pyramid tomorrow',
         'ms': 'Tolong ambil bungkusan saya di Pyramid esok'}

ui = UI(*sys.argv[1:])
reach_home(ui)
open_sheet(ui)
idle = {name: by_id(ui.read(), name)['frame'] for name in ('ask-tapir-field', 'ask-tapir-mic')}
ui.tap('ask-tapir-mic')
ui.wait_label('ask-tapir-mic', lambda label: label == ui.t('ask.voice.stop'), 'the mic did not turn into 停')
assert by_id(ui.read(), 'ask-voice-explain') is None, 'the card showed although both permissions were granted'
assert ai_calls(ui, 'speechRequestPermissions', 1, timeout=1) == [], 'granted permissions were asked again'
ui.at_rest()
shot = ui.snap('01-listening-cloud')
hint = ui.t('ask.voice.listeningCloud').split('…')[0]
field = by_id(ui.read(), 'ask-tapir-field')['frame']
# RN does not expose a multiline field's placeholder to AX, so the hint is read from the pixels.
assert find(lines_in(shot, ui.locale), hint, field), f'the field does not say {hint} while listening'
now = {name: by_id(ui.read(), name)['frame'] for name in idle}
assert abs(now['ask-tapir-mic']['y'] - idle['ask-tapir-mic']['y']) < 1, \
    f'停 moved from under the finger when the hint appeared: {idle["ask-tapir-mic"]} to {now["ask-tapir-mic"]}'
if ui.locale == 'zh-Hans':
    assert abs(now['ask-tapir-field']['height'] - idle['ask-tapir-field']['height']) < 1, \
        f'the listening hint wraps and the field jumps: {idle["ask-tapir-field"]} to {now["ask-tapir-field"]}'

ui.tap('ask-tapir-mic')
ui.element('ask-consent-screen', timeout=30)
assert ai_calls(ui, 'transcribe', 1, timeout=1) == [], 'the recording left before consent'
ui.at_rest()
ui.capture('02-consent-before-upload')

ui.tap('ask-consent-agree')
ui.gone('ask-consent-screen', timeout=30)
ui.element('ask-tapir-transcribing', timeout=10)
shot = ui.snap('03-transcribing')
assert by_id(captured(ui, '03-transcribing'), 'ask-tapir-transcribing'), 'the words came before 03-transcribing was captured'
writing = re.escape(ui.t('ask.voice.transcribing').rstrip('…'))
assert find(lines_in(shot, ui.locale), writing, by_id(ui.read(), 'ask-tapir-field')['frame']), \
    'the field does not say the words are being written down'
ui.wait(lambda items: (by_id(items, 'ask-tapir-prompt') or {}).get('AXValue') == WORDS[ui.locale],
        'the written-down words never filled the field')
assert assert_calls(ui, 'transcribe', 1) == [{'language': ui.locale, 'audio': True}]
assert_calls(ui, 'ask', 0, wait=1)
ui.element('ask-tapir-send')
ui.at_rest()
ui.capture('04-written-down')
print('PASS: cloud listening asks consent before the recording leaves; the words fill the field and nothing else is sent')
