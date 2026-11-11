"""我的 → 小貘 shows 「让小貘用云端」 on with the provider and the consent date. Turning it off shows progress, withdraws
once and says the manual path stays; turning it on opens the consent page (「先不用」 from here), and 同意 brings the
switch back on with today's date."""
import sys
from datetime import date

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import assert_calls, footer, toggle_on  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/account/MeView.tsx', 'src/app/(tabs)/me/', 'src/app/ask-consent.tsx',
        'src/lib/i18n/locales/ask/', 'src/ui/NoticeCard.tsx', 'verification/ui/ask.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'given', '-uiVerifyAiDelayMs', '2500']

ui = UI(*sys.argv[1:])


def given_footer(day):
    return ui.t('ask.settings.givenFooter', provider=ui.t('ask.provider'), date=f'{day.year}/{day.month}/{day.day}')


reach_home(ui)
ui.tap('tab-me')
ui.tap('me-tapir')
ui.element('tapir-settings-screen', timeout=30)
ui.wait(lambda items: toggle_on(items) is True, 'the switch is not on for a given consent')
if ui.locale == 'zh-Hans':
    footer(ui, given_footer(date(2026, 10, 31)))
ui.at_rest()
ui.capture('01-on')

ui.flip('tapir-cloud')
ui.element('tapir-cloud-withdrawing', timeout=10)
ui.capture('02-withdrawing')
ui.wait(lambda items: toggle_on(items) is False, 'the switch did not turn off')
footer(ui, ui.t('ask.settings.offFooter'))
assert_calls(ui, 'withdraw', 1)
ui.at_rest()
ui.capture('03-off')

ui.flip('tapir-cloud')
ui.element('ask-consent-screen', timeout=30)
ui.wait_label('ask-consent-decline', lambda text: text == ui.t('ask.consent.declineFromMe'), 'decline label is wrong')
ui.tap('ask-consent-decline')
ui.gone('ask-consent-screen')
ui.wait(lambda items: toggle_on(items) is False, 'declining turned the switch on')
assert_calls(ui, 'record', 0, wait=1)

ui.flip('tapir-cloud')
ui.element('ask-consent-screen', timeout=30)
ui.tap('ask-consent-agree')
ui.gone('ask-consent-screen', timeout=30)
ui.wait(lambda items: toggle_on(items) is True, 'the switch did not turn on after 同意')
if ui.locale == 'zh-Hans':
    footer(ui, given_footer(date.today()))
assert assert_calls(ui, 'record', 1) == [{'version': 1}]
assert by_id(ui.read(), 'tapir-settings-withdraw-failed') is None
ui.at_rest()
ui.capture('04-on-again')
print('PASS: 我的 → 小貘 switch withdraws with progress and re-consents through the consent page')
