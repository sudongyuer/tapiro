"""Worst cases in 问小貘. A provider error shows 小貘晕了 with 再试一次 and 自己填, keeps the words, and is not sent
again until 再试一次. An empty belly (placeholder until Task 5) offers only 自己填, which opens the post form. A failed
connection keeps the words. Consent withdrawn on another device mid-session brings the consent page back; 同意 sends
the same words once. A draft whose reward and time the form refuses fills the rest, keeps the older reward and names
both. A screenshot holding two requests offers both; picking one gives its draft with no second call."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import TYPED, ask_texts, assert_calls, failure, open_sheet, prompt_value, turn, type_and_send  # noqa: E402
from bounty import relaunch, value  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskTapirSheet.tsx', 'src/app/ask.tsx', 'src/app/ask-consent.tsx',
        'src/lib/drafts/', 'src/features/bounty/post/', 'src/lib/i18n/locales/ask/', 'src/lib/i18n/locales/bounty/',
        'verification/ui/ask.py', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 600
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'given',
        '-uiVerifyAiDelayMs', '800', '-uiVerifyAiReplies', 'providerError,answer']
REPLIES = ['-uiVerifyAiReplies', 'providerError,answer']


def again(replies, *extra):
    relaunch(ui, drop=REPLIES, add=['-uiVerifyAiReplies', replies, *extra])
    open_sheet(ui)


ui = UI(*sys.argv[1:])
reach_home(ui)
open_sheet(ui)
type_and_send(ui)
failure(ui, 'providerError', 'ask.sheet.providerError')
assert prompt_value(ui) == TYPED, f'the error lost the words: {prompt_value(ui)!r}'
assert_calls(ui, 'ask', 1, wait=3)
for identifier in ('ask-retry', 'ask-manual'):
    assert by_id(ui.read(), identifier)['frame']['height'] >= 44, f'{identifier} is under 44 pt'
ui.at_rest()
ui.capture('01-provider-error')
ui.tap('ask-retry')
turn(ui, 1)
assert by_id(ui.read(), 'ask-failure-providerError') is None, 'the error stayed after the answer'
assert ask_texts(ui, 2, wait=1) == [TYPED, TYPED]

again('hungry')
type_and_send(ui)
ui.element('ask-hungry-tomorrow', timeout=30)
assert prompt_value(ui) == TYPED, f'the hungry answer lost the words: {prompt_value(ui)!r}'
assert by_id(ui.read(), 'ask-retry') is None, 'an empty belly offered 再试一次'
ui.at_rest()
ui.capture('02-hungry')
ui.tap('ask-manual')
ui.wait(lambda items: by_id(items, 'bounty-post-pick') or by_id(items, 'bounty-post-form'), '自己填 opened no post form')
assert by_id(ui.read(), 'ask-tapir-sheet') is None, 'the sheet stayed over the post form'

again('offline')
type_and_send(ui)
failure(ui, 'offline', 'ask.composer.offline')
assert prompt_value(ui) == TYPED
ui.at_rest()
ui.capture('03-offline')

again('consentRequired,answer')
type_and_send(ui)
ui.element('ask-consent-screen', timeout=30)
ui.capture('04-consent-withdrawn-elsewhere')
ui.tap('ask-consent-agree')
ui.gone('ask-consent-screen', timeout=30)
turn(ui, 1)
assert_calls(ui, 'record', 1, wait=1)
assert ask_texts(ui, 2, wait=1) == [TYPED, TYPED]

relaunch(ui, drop=REPLIES, add=['-uiVerifyAiReplies', 'draftDropped', '-uiVerifyBountyDraft', 'one'])
open_sheet(ui)
type_and_send(ui)
turn(ui, 1)
ui.tap('ask-turn-1-fill')
ui.element('bounty-post-ai-filled', timeout=20)
kept, empty = ui.t('bounty.post.aiFill.rewardKept'), ui.t('bounty.post.aiFill.timeEmpty')
ui.wait_label('bounty-post-ai-dropped-reward', lambda label: label == kept, 'the dropped reward is not named')
ui.wait_label('bounty-post-ai-dropped-time', lambda label: label == empty, 'the dropped time is not named')
assert value(ui, 'bounty-post-reward') == '1', f'the older reward did not stay: {value(ui, "bounty-post-reward")!r}'
assert value(ui, 'bounty-post-title') == '帮搬两个箱子上三楼'
ui.at_rest()
ui.capture('05-dropped-fields')

relaunch(ui, drop=REPLIES, add=['-uiVerifyAiReplies', 'pick'])
open_sheet(ui)
ui.tap('ask-tapir-add-image')
turn(ui, 1)
ui.element('ask-turn-1-item-1')
ui.at_rest()
ui.capture('06-screenshot-pick')
ui.tap('ask-turn-1-item-0')
turn(ui, 3)
ui.wait_label('ask-turn-3-title', lambda label: label == '明天帮搬家具', 'the picked draft is wrong')
calls = assert_calls(ui, 'ask', 1, wait=2)
assert calls == [{'text': '', 'image': True}], f'the screenshot was sent as {calls}'
ui.at_rest()
ui.capture('07-picked-draft')
print('PASS: provider error and retry, hungry placeholder, offline, consent withdrawn mid-session, dropped fields named, screenshot pick')
