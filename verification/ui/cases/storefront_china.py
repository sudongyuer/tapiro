"""China mainland storefront: no 问小貘 button beside the tab bar, the calm card keeps its greeting but has no ask field
or sample tags, 我的 has no 问小貘 row, and 设置 says why under the legal rows and shows the App 备案号 row."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, assert_touch_target, by_id, reach_home  # noqa: E402

DEPS = ['src/lib/storefront/', 'src/lib/icpFiling.ts', 'src/app/(tabs)/_layout.tsx', 'src/app/(tabs)/me/',
        'src/app/(tabs)/bounty/index.tsx', 'src/features/home/cards/CalmCard.tsx', 'src/features/account/MeView.tsx',
        'src/features/account/SettingsView.tsx', 'modules/tapiro-kit/index.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyStorefront', 'CHN',
        '-uiVerifyIcpFiling', '粤ICP备2026000001号-2A']
ICP = ARGS[-1]

ui = UI(*sys.argv[1:])
reach_home(ui)
ui.element('tab-me')
ui.settled(lambda items: by_id(items, 'live-card-calm'), 'home never showed the calm card')
items = ui.read()
assert by_id(items, 'tab-ask-tapir') is None, '问小貘 button shown on the China mainland storefront'
assert by_id(items, 'home-ask') is None, 'calm card offers 问小貘 on the China mainland storefront'
assert by_id(items, 'home-calm-chip-0') is None, 'calm card shows 问小貘 sample tags on the China mainland storefront'
ui.snap('01-home')

ui.tap('tab-me')
ui.settled(lambda items: by_id(items, 'me-settings'), '我的 never showed its rows')
items = ui.read()
assert by_id(items, 'me-invite') and by_id(items, 'me-payee'), '我的 lost rows other than 问小貘'
assert by_id(items, 'me-tapir') is None, '我的 shows the 问小貘 row on the China mainland storefront'
ui.capture('02-me')

ui.tap('me-settings')
# The note shows only once the storefront has resolved to CHN (closed-while-pending would also hide the AI above), so it
# proves the absences were checked on a resolved China storefront.
note = ui.wait_label('settings-region-note', lambda label: label == ui.t('account.settings.regionNoAi'),
                     'settings does not say why AI is missing')
icp = ui.wait_label('settings-icp', lambda label: ui.t('account.settings.icp') in label and ICP in label,
                    'settings does not show the App 备案号 row')
assert_touch_target(by_id(ui.read(), 'settings-privacy'), 'settings-privacy')
width = ui.read()[0]['frame']['width']
for element in (note, icp):
    f = element['frame']
    assert f['x'] >= 0 and f['x'] + f['width'] <= width, f'{element["AXUniqueId"]} overflows: {f}'
shot = ui.capture('03-settings')
assert_appearance(shot, ui.appearance, 20, 2500, 'settings background')
print('PASS: China mainland storefront hides AI and shows the filing number')
