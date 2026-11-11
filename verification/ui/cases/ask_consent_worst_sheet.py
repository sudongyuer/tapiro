"""Worst cases from the sheet. Offline (both status reads fail): 发送 says nothing was sent, keeps the text and opens no
consent page. A failed record keeps the consent page with 「没记下来」 and is not replayed; 同意 again records once.
Already consented on another device: 发送 opens no consent page and records nothing. A newer consent version on the
server: 发送 says to update the app and opens no consent page; a version bumped while the page is open turns 同意 into
知道了, and the sheet then says to update instead of asking again."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import TYPED, assert_calls, note, open_sheet, prompt_value, type_and_send  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskTapirSheet.tsx', 'src/app/ask.tsx', 'src/app/ask-consent.tsx',
        'src/lib/i18n/locales/ask/', 'src/ui/NoticeCard.tsx', 'verification/ui/ask.py', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 540
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiDelayMs', '1500', '-uiVerifyAiFail', 'load,loadAgain']

OFFLINE = ['-uiVerifyAiFail', 'load,loadAgain']  # relaunch starts from ARGS, so each one drops this
ui = UI(*sys.argv[1:])
reach_home(ui)
open_sheet(ui)
type_and_send(ui)
note(ui, 'ask.composer.offline')
assert by_id(ui.read(), 'ask-consent-screen') is None, 'offline opened the consent page'
assert prompt_value(ui) == TYPED
ui.at_rest()
ui.capture('01-offline')

relaunch(ui, drop=OFFLINE, add=['-uiVerifyAiFail', 'record'])
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

relaunch(ui, drop=OFFLINE, add=['-uiVerifyAiConsent', 'given'])
open_sheet(ui)
type_and_send(ui)
note(ui, 'ask.composer.held')
assert by_id(ui.read(), 'ask-consent-screen') is None, 'consent from another device was asked again'
assert_calls(ui, 'record', 0, wait=1)
ui.at_rest()
ui.capture('03-given-elsewhere')

relaunch(ui, drop=OFFLINE, add=['-uiVerifyAiConsent', 'bumped'])
open_sheet(ui)
type_and_send(ui)
ui.element('ask-consent-screen', timeout=30)
ui.tap('ask-consent-agree')
ui.element('ask-consent-needs-update', timeout=30)
items = ui.read()
assert by_id(items, 'ask-consent-agree') is None, 'the page still offers 同意 after the server refused the version'
ui.capture('04-bumped-while-open')
ui.tap('ask-consent-close')
ui.gone('ask-consent-screen')
note(ui, 'ask.composer.needsUpdate')
type_and_send(ui)
note(ui, 'ask.composer.needsUpdate')
assert by_id(ui.read(), 'ask-consent-screen') is None, 'the refused version was offered again'
assert_calls(ui, 'record', 1, wait=1)

relaunch(ui, drop=OFFLINE, add=['-uiVerifyAiConsent', 'newer'])
open_sheet(ui)
type_and_send(ui)
note(ui, 'ask.composer.needsUpdate')
assert by_id(ui.read(), 'ask-consent-screen') is None, 'a newer version opened a page it cannot record'
assert_calls(ui, 'record', 0, wait=1)
ui.at_rest()
ui.capture('05-needs-update')
print('PASS: offline, a failed record, consent from another device and a newer version, from the sheet')
