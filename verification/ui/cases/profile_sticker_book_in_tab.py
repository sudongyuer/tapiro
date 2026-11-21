"""Your own profile reached inside 拼车 (a member list of your own ride; audit R3): the sticker book row opens
一起办成的事 over the current screen without switching to 我的, and 返回 lands back on the profile in 拼车. The row and the
book count the same 23 stickers."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from profile import open_profile, scroll_to  # noqa: E402

DEPS = ['src/features/reputation/profile/', 'src/app/sticker-book.tsx', 'src/app/(tabs)/me/stickers.tsx',
        'src/features/stickers/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
SCENE = 'profile'
BUDGET = 200
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson',
        '00000000-0000-4000-8000-000000000001', '-uiVerifyProfileTab', 'ride', '-uiVerifyStickers', 'many']


def tab_selected(items, tab):
    return str((by_id(items, tab) or {}).get('AXValue')) == '1'


ui = UI(*sys.argv[1:])
open_profile(ui)
ui.wait(lambda items: tab_selected(items, 'tab-ride'), '拼车 is not selected under the profile')
scroll_to(ui, 'profile-stickers')
shown = ui.element('profile-stickers').get('AXLabel') or ''
assert ui.tn('stickers.count', 23) in shown, f'the profile row does not count the 23 stickers the book holds: {shown}'
ui.tap('profile-stickers')
ui.element('sticker-stack', timeout=30)
ui.wait_label('sticker-stack-position', lambda label: ui.t('stickers.card.position', index=1, total=23) in label,
              'the sticker book does not hold the 23 stickers the profile shows', timeout=30)
assert not tab_selected(ui.read(), 'tab-me'), 'the sticker book switched to 我的'
ui.at_rest()
ui.capture('01-sticker-book')
ui.tap('BackButton')
ui.gone('sticker-stack')
ui.element('profile-stickers')
back = ui.element('BackButton')
assert back.get('AXLabel') == ui.t('shell.tabs.ride'), f'返回 did not land on the profile in 拼车: {back.get("AXLabel")}'
ui.capture('02-back-on-profile')
print('PASS: the sticker book opens over your profile in 拼车 and 返回 comes back to it')
