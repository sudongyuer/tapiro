"""The first 发送 in 问小貘 opens the consent page before anything leaves the phone: it names Alibaba Cloud Model Studio
(Singapore), the purpose, what is sent, what is never sent and where chats stay. 「先不用，我自己填」 records nothing and
keeps the typed text, and so does swiping the page down; the next 发送 asks again; 同意 shows progress, records version 1 once and returns to the sheet with
the text kept (drafting arrives in Task 4, so the stub says so)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import TYPED, ai_calls, assert_calls, note, open_sheet, prompt_value, type_and_send  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402
from gestures import drag  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskTapirSheet.tsx', 'src/app/ask.tsx', 'src/app/ask-consent.tsx',
        'src/app/_layout.tsx', 'src/lib/i18n/locales/ask/', 'src/ui/SheetFrame.tsx', 'src/ui/PillButton.tsx',
        'verification/ui/ask.py', 'verification/ui/gestures.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'none', '-uiVerifyAiDelayMs', '2500']

ui = UI(*sys.argv[1:])
reach_home(ui)
open_sheet(ui)
type_and_send(ui)

ui.element('ask-consent-screen', timeout=30)
ui.wait_label('ask-consent-title', lambda text: text == ui.t('ask.consent.title'), 'consent title is wrong')
items = ui.read()
body = by_id(items, 'ask-consent-body').get('AXLabel') or ''
assert ui.t('ask.provider') in body, f'the body does not name the provider: {body}'
for fact, label, value in (('sends', 'sendsLabel', 'sends'), ('never', 'neverLabel', 'never'), ('kept', 'keptLabel', 'kept')):
    text = by_id(items, f'ask-consent-{fact}').get('AXLabel') or ''
    assert ui.t(f'ask.consent.{label}') in text and ui.t(f'ask.consent.{value}') in text, f'{fact} row reads {text}'
assert by_id(items, 'ask-consent-decline').get('AXLabel') == ui.t('ask.consent.decline')
for identifier in ('ask-consent-agree', 'ask-consent-decline', 'ask-consent-privacy'):
    f = by_id(items, identifier)['frame']
    assert f['height'] >= 44, f'{identifier} is under 44 pt: {f}'
assert ai_calls(ui, 'record', 1, timeout=1) == [], 'consent was recorded before 同意'
ui.at_rest()
ui.capture('01-consent')

ui.tap('ask-consent-decline')
ui.gone('ask-consent-screen')
ui.element('ask-tapir-sheet')
assert prompt_value(ui) == TYPED, f'declining lost the text: {prompt_value(ui)!r}'
assert by_id(ui.read(), 'ask-tapir-note') is None, 'declining showed a note'
assert_calls(ui, 'record', 0, wait=1)
ui.at_rest()
ui.capture('02-declined-text-kept')

type_and_send(ui)
ui.element('ask-consent-screen', timeout=30)
ui.at_rest()
title = by_id(ui.read(), 'ask-consent-title')['frame']
drag(ui, (title['x'] + title['width'] / 2, title['y'] - 40), (title['x'] + title['width'] / 2, title['y'] + 500), 0.6, 30)
ui.gone('ask-consent-screen', timeout=20)
assert prompt_value(ui) == TYPED, f'swiping the page down lost the text: {prompt_value(ui)!r}'
assert by_id(ui.read(), 'ask-tapir-send'), 'the sheet is still checking after the page was swiped away'
assert_calls(ui, 'record', 0, wait=1)

type_and_send(ui)
ui.element('ask-consent-screen', timeout=30)
ui.tap('ask-consent-agree')
ui.wait_label('ask-consent-agree', lambda text: text == ui.t('ask.consent.agreeing'), 'no progress while recording')
ui.capture('03-recording')
ui.gone('ask-consent-screen', timeout=30)
note(ui, 'ask.composer.held')
assert prompt_value(ui) == TYPED, f'consenting lost the text: {prompt_value(ui)!r}'
assert assert_calls(ui, 'record', 1) == [{'version': 1}]
ui.at_rest()
ui.capture('04-consented')

type_and_send(ui)
note(ui, 'ask.composer.held')
assert by_id(ui.read(), 'ask-consent-screen') is None, 'the consent page came back after consent'
assert_calls(ui, 'record', 1, wait=1)
print('PASS: consent before the first send; decline keeps the text and records nothing; agree records version 1 once')
