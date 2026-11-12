"""When the microphone is refused at the system prompt, the 问小貘 sheet says the microphone is off with 去设置 instead of
listening, keeps what was typed, and typing still works (manual path)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import TYPED, ai_calls, open_sheet, prompt_value  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskInput.tsx', 'src/app/ask.tsx', 'src/lib/i18n/locales/ask/',
        'verification/ui/ask.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyVoice', 'refuse']

ui = UI(*sys.argv[1:])
reach_home(ui)
open_sheet(ui)
ui.tap('ask-tapir-prompt')
ui.type(TYPED)
ui.wait(lambda items: (by_id(items, 'ask-tapir-prompt') or {}).get('AXValue') == TYPED, 'typing did not land')
ui.tap('ask-tapir-mic')
ui.tap('ask-voice-explain-button')
ui.element('ask-voice-blocked')
ui.wait_label('ask-voice-blocked-title', lambda text: text == ui.t('ask.voice.blockedTitle'), 'blocked title is wrong')
ui.wait_label('ask-voice-blocked-button', lambda text: text == ui.t('ask.voice.openSettings'), 'no 去设置')
assert ai_calls(ui, 'speechStart', 1, timeout=2) == [], 'listening started without the microphone'
assert prompt_value(ui) == TYPED, f'the typed words were lost: {prompt_value(ui)!r}'
assert by_id(ui.read(), 'ask-voice-blocked-button')['frame']['height'] >= 43, '去设置 is under 44 pt'
ui.at_rest()
ui.capture('01-blocked')
print('PASS: a refused microphone shows 去设置, never listens, and keeps the typed words')
