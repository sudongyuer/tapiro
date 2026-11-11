"""Worst cases from the sheet. Offline (both status reads fail): 发送 says nothing was sent, keeps the text and opens no
consent page. A failed record keeps the consent page with 「没记下来」 and is not replayed; 同意 again records once.
Already consented on another device: 发送 opens no consent page and records nothing. A newer consent version on the
server: 发送 says to update the app and opens no consent page."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import TYPED, assert_calls, note, open_sheet, prompt_value, type_and_send  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskTapirSheet.tsx', 'src/app/ask.tsx', 'src/app/ask-consent.tsx',
        'src/lib/i18n/locales/ask/', 'src/ui/NoticeCard.tsx', 'verification/ui/ask.py', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 420
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiDelayMs', '1500', '-uiVerifyAiFail', 'load,loadAgain']

ui = UI(*sys.argv[1:])
reach_home(ui)
open_sheet(ui)
type_and_send(ui)
note(ui, 'ask.composer.offline')
assert by_id(ui.read(), 'ask-consent-screen') is None, 'offline opened the consent page'
assert prompt_value(ui) == TYPED
ui.at_rest()
ui.capture('01-offline')

relaunch(ui, drop=['-uiVerifyAiFail', 'load,loadAgain'], add=['-uiVerifyAiFail', 'record'])
open_sheet(ui)
type_and_send(ui)
ui.element('ask-consent-screen', timeout=30)
ui.tap('ask-consent-agree')
ui.element('ask-consent-failed', timeout=30)
assert by_id(ui.read(), 'ask-consent-screen'), 'a failed record closed the page'
assert_calls(ui, 'record', 1)
ui.at_rest()
ui.capture('02-record-failed')
ui.tap('ask-consent-agree')
ui.gone('ask-consent-screen', timeout=30)
note(ui, 'ask.composer.held')
assert_calls(ui, 'record', 2, wait=1)

relaunch(ui, drop=['-uiVerifyAiFail', 'record'], add=['-uiVerifyAiConsent', 'given'])
open_sheet(ui)
type_and_send(ui)
note(ui, 'ask.composer.held')
assert by_id(ui.read(), 'ask-consent-screen') is None, 'consent from another device was asked again'
assert_calls(ui, 'record', 0, wait=1)
ui.at_rest()
ui.capture('03-given-elsewhere')

relaunch(ui, drop=['-uiVerifyAiConsent', 'given'], add=['-uiVerifyAiConsent', 'newer'])
open_sheet(ui)
type_and_send(ui)
note(ui, 'ask.composer.needsUpdate')
assert by_id(ui.read(), 'ask-consent-screen') is None, 'a newer version opened a page it cannot record'
assert_calls(ui, 'record', 0, wait=1)
ui.at_rest()
ui.capture('04-needs-update')
print('PASS: offline, a failed record, consent from another device and a newer version, from the sheet')
