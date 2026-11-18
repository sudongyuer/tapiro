"""问小貘 answers in the sheet. A suggestion fills the field and sends nothing; 发送 sends it and shows progress, then 小貘's answer
under the words, and the field clears. A short request gets one question with buttons; tapping one sends the earlier
words with the question and its answer, and the draft card comes back; that draft empties the belly, and its 填进表单
stays whole under the sheet's bar with no hungry card until the next ask (ASK-1). Each open is new, with 「接着上次：…」 on top
that restores the last conversation, also after a restart. Words typed but not sent are kept on the device: closing the
sheet and restarting the app keep them."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import TYPED, ask_texts, captured, close_button, close_sheet, open_sheet, prompt_value, turn, type_and_send  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskTapirSheet.tsx', 'src/app/ask.tsx', 'src/lib/drafts/',
        'src/lib/i18n/locales/ask/', 'verification/ui/ask.py', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 420
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'given',
        '-uiVerifyAiDelayMs', '8000', '-uiVerifyAiReplies', 'answer,clarify,draft']

ui = UI(*sys.argv[1:])
reach_home(ui)
open_sheet(ui)
suggestion = ui.t('shell.ask.suggestions.writeBounty')
ui.tap('ask-tapir-suggestion-2')
ui.wait(lambda items: (by_id(items, 'ask-tapir-prompt') or {}).get('AXValue') == suggestion,
        'the suggestion did not fill the field')
assert ask_texts(ui, 0, wait=1) == [], 'a suggestion sent something'
ui.capture('01-suggestion-filled')

type_and_send(ui, suggestion)
ui.element('ask-thinking', timeout=10)
ui.element('ask-tapir-checking', timeout=5)
ui.capture('02-thinking')
# The tree is written after the picture, so progress in the tree means progress in the picture.
assert by_id(captured(ui, '02-thinking'), 'ask-thinking'), 'the answer came before 02-thinking was captured'
turn(ui, 1)
ui.element('ask-turn-1-text')
assert by_id(ui.read(), 'ask-tapir-suggestion-0') is None, 'suggestions stayed over the conversation'
assert prompt_value(ui) == '', f'the answer did not clear the field: {prompt_value(ui)!r}'
assert ask_texts(ui, 1) == [suggestion]
ui.at_rest()
ui.capture('03-answer')

type_and_send(ui, TYPED)
turn(ui, 3)
ui.element('ask-turn-3-question')
skip = by_id(ui.read(), 'ask-turn-3-choice-3')
assert skip and skip.get('AXLabel') == ui.t('ask.sheet.skip'), f'no skip button: {skip}'
for index in range(4):
    f = by_id(ui.read(), f'ask-turn-3-choice-{index}')['frame']
    assert f['height'] >= 42, f'choice {index} is under 44 pt at the sheet scale: {f}'
ui.at_rest()
ui.capture('04-question')
ui.tap('ask-turn-3-choice-1')
turn(ui, 5)
ui.element('ask-turn-5-fill')
assert ask_texts(ui, 3)[2] == f'{TYPED}\n什么时候要？ 今晚', 'the button answer went without its question'
assert by_id(ui.read(), 'ask-turn-3-choice-0').get('enabled') is False, 'an answered question still takes taps'
ui.at_rest()
items = ui.read()
hungry = [i.get('AXUniqueId') for i in items if (i.get('AXUniqueId') or '').startswith('ask-hungry-')]
assert not hungry, f'the hungry card came with the draft: {hungry}'
bar, fill, sheet = close_button(ui, items)['frame'], by_id(items, 'ask-turn-5-fill')['frame'], \
    by_id(items, 'ask-tapir-sheet')['frame']
assert fill['y'] >= bar['y'] + bar['height'] and fill['y'] + fill['height'] <= sheet['y'] + sheet['height'], \
    f'填进表单 is not whole between the bar and the sheet bottom: {fill}, bar {bar}, sheet {sheet}'
ui.capture('05-draft-after-button')

ui.tap('ask-tapir-prompt')
ui.type('Keep')
ui.wait(lambda items: (by_id(items, 'ask-tapir-prompt') or {}).get('AXValue') == 'Keep', 'the field never read Keep')
close_sheet(ui)
open_sheet(ui)
assert by_id(ui.read(), 'ask-turn-0') is None, 'the sheet reopened the old conversation'
resume = ui.t('ask.sheet.resume', text=suggestion)
ui.wait_label('ask-resume', lambda label: label.startswith(resume), f'the resume line is not {resume}')
assert prompt_value(ui) == 'Keep', f'closing the sheet lost the typed words: {prompt_value(ui)!r}'
ui.at_rest()
sheet, manual = (by_id(ui.read(), name)['frame'] for name in ('ask-tapir-sheet', 'ask-manual'))
assert manual['y'] + manual['height'] <= sheet['y'] + sheet['height'], \
    f'自己填 is cut by the sheet bottom under 接着上次: {manual} in {sheet}'
ui.capture('06-new-with-resume')

relaunch(ui, drop=[], add=['-uiVerifyAskKeep', '1'])
open_sheet(ui)
ui.wait_label('ask-resume', lambda label: label.startswith(resume), 'a restart lost the last conversation')
assert prompt_value(ui) == 'Keep', f'a restart lost the typed words: {prompt_value(ui)!r}'
ui.tap('ask-resume')
turn(ui, 5)
ui.element('ask-turn-5-fill')
ui.at_rest()
ui.capture('07-resumed')
print('PASS: suggestion fills, answer, one question with buttons, a draft; each open new with 接着上次; words kept on the device')
