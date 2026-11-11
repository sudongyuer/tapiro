"""Worst cases on 我的 → 小貘. A failed first load shows 「没加载出来」 with 重试 and no switch, never an off switch;
重试 loads it. A failed withdrawal keeps the switch on with 「没关掉」 and is not replayed. A newer consent version shows
the switch off and disabled with 「更新 App 后才能打开」."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import assert_calls, footer, toggle_on  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/ask/', 'src/app/(tabs)/me/', 'src/debug/CoinsScenes.tsx', 'src/lib/i18n/locales/ask/',
        'src/ui/NoticeCard.tsx', 'verification/ui/ask.py', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 360
SCENE = 'tapir-settings'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'given', '-uiVerifyAiDelayMs', '1500', '-uiVerifyAiFail', 'load']

ui = UI(*sys.argv[1:])
ui.element('tapir-settings-failed', timeout=60)
assert by_id(ui.read(), 'tapir-cloud') is None, 'a failed load shows a switch'
assert_calls(ui, 'status', 1)
ui.at_rest()
ui.capture('01-load-failed')
ui.tap('tapir-settings-retry')
ui.wait(lambda items: toggle_on(items) is True, '重试 never loaded the switch')
assert by_id(ui.read(), 'tapir-settings-failed') is None

relaunch(ui, drop=['-uiVerifyAiFail', 'load'], add=['-uiVerifyAiFail', 'withdraw'], ready='tapir-settings-screen')
ui.wait(lambda items: toggle_on(items) is True, 'the switch is not on')
ui.flip('tapir-cloud')
ui.element('tapir-settings-withdraw-failed', timeout=30)
ui.wait(lambda items: toggle_on(items) is True, 'a failed withdrawal shows the switch off')
assert_calls(ui, 'withdraw', 1)
ui.at_rest()
ui.capture('02-withdraw-failed')

relaunch(ui, drop=['-uiVerifyAiConsent', 'given'], add=['-uiVerifyAiConsent', 'newer'],
         ready='tapir-settings-screen')
ui.wait(lambda items: toggle_on(items) is False, 'the switch is not off for a newer version')
footer(ui, ui.t('ask.settings.needsUpdateFooter'))
assert by_id(ui.read(), 'tapir-cloud').get('enabled') is False, 'the switch can be turned on for terms it cannot show'
ui.at_rest()
ui.capture('03-needs-update')
print('PASS: failed load, failed withdrawal and a newer version on 我的 → 小貘')
