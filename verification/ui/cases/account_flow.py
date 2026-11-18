"""Sign in with the fixture, blank the name (spaces only) and see the error, paste a name, pick a language, reach home, sign out and back in, then delete the account and land on welcome.
On the way: the continue button sits one space-4 above the keyboard, the caret is the accent, the language step shares the
name step's column and bubble height, the moment titles have their white outline in light, settings shows the avatar and opens 用户协议 and 隐私政策, and the delete sheet reads no symbol names."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import paste_into  # noqa: E402
from driver import UI, assert_appearance, assert_touch_target, bottom, by_id, close, sign_in_apple, token  # noqa: E402
from halo import assert_title_halo  # noqa: E402
from keys import backspace, type_text  # noqa: E402

DEPS = [
    'src/features/account/',
    'src/app/welcome.tsx',
    'src/app/onboarding/',
    'src/app/(tabs)/',
    'src/app/delete-account.tsx',
    'src/app/legal/',
    'src/features/shell/',
    'src/features/home/',
    'verification/ui/bounty.py',
    'verification/ui/pasteboard.swift',
    'verification/ui/halo.py',
    'verification/ui/keys.py',
]

LOCALES = ['zh-Hans', 'ms']
BUDGET = 320
NAME = 'Lin Mo'
BLANK = '   '
DELETE_ITEMS = ['profile', 'payee', 'messages', 'memory', 'coins', 'stickers']

ui = UI(*sys.argv[1:])


def value(identifier):
    return ui.element(identifier).get('AXValue') or ''


def sign_in():
    sign_in_apple(ui)


# One paste per launch: a second paste in the same launch sometimes inserted the pasteboard of the first although
# pbpaste read the new text, on both of paste_into's attempts (2026-11-17, 2026-11-18), so the blank name is typed.
def blank_name():
    ui.tap('name-input', expect_change=False)
    backspace(ui, 8)
    type_text(ui, BLANK)
    ui.wait(lambda items: (by_id(items, 'name-input') or {}).get('AXValue') == BLANK,
            'name-input does not read the blank name')


def open_me():
    ui.tap('tab-me')
    return ui.element('me-profile')


def keyboard_gap():
    seen = []

    def check(items):
        keyboard, button = by_id(items, 'inputView'), by_id(items, 'name-continue')
        if keyboard is None or button is None:
            return None
        seen.append(keyboard['frame']['y'] - bottom(button))
        return seen[-1:] if len(seen) >= 2 and seen[-1] == seen[-2] else None

    return ui.wait(check, 'the keyboard never settled under the name step')[0]


def caret_pixels(shot, field):
    paper = token('--color-filled-row', ui.appearance)
    region = {'x': field['x'], 'y': field['y'] + 10, 'width': 40, 'height': field['height'] - 20}
    return [rgb for rgb in shot.pixels(region) if not close(rgb, paper, 40)]


def assert_caret_is_accent():
    field = ui.element('name-input')['frame']
    deadline = time.monotonic() + 8
    while True:
        ink = caret_pixels(ui.snap('03-caret'), field)
        if len(ink) >= 12:
            break
        assert time.monotonic() < deadline, f'the caret never showed in the empty name field ({len(ink)} px)'
        time.sleep(0.2)  # the caret blinks; another frame catches it lit
    blue = [rgb for rgb in ink if rgb[2] - rgb[0] > 60]
    assert not blue, f'the caret is system blue, not the accent: {blue[:3]}'


def open_settings():
    ui.tap('me-settings')
    ui.element('settings-delete')


ui.element('sign-in-apple')
ui.at_rest()
shot = ui.capture('01-welcome')
assert_appearance(shot, ui.appearance, 20, 2500, 'welcome background')

sign_in()
ui.wait(lambda items: any(i.get('AXUniqueId') == 'name-input' and '林小貘' in (i.get('AXValue') or '') for i in items),
        'name not prefilled from the fixture profile')
assert_touch_target(ui.element('name-input'), 'name field')
assert_touch_target(ui.element('name-continue'), 'continue button')
name_title = ui.labelled(ui.t('account.name.question'))['frame']
name_bubble = ui.labelled(ui.t('account.name.greeting'))['frame']
assert_title_halo(ui, ui.snap('02-name-prefilled'), name_title, 'name question')

blank_name()
ui.tap('name-continue')
ui.element('name-error')
gap = keyboard_gap()
assert 12 <= gap <= 20, f'continue sits {gap:.1f} pt above the keyboard, expected one space-4 (16)'
assert_caret_is_accent()
ui.capture('03-name-empty')
paste_into(ui, 'name-input', NAME)
ui.tap('name-continue')

done = ui.element('language-done')
assert_touch_target(done, 'get started button')
before = done.get('AXLabel')
title = ui.labelled(ui.t('account.language.question'))['frame']
bubble = ui.labelled(ui.t('account.language.greeting'))['frame']
row = ui.labelled(ui.t('languages.en'))['frame']
assert abs(title['x'] - name_title['x']) <= 1, f'language title starts at {title["x"]}, the name title at {name_title["x"]}'
assert abs(row['x'] - name_title['x']) <= 1, f'language rows start at {row["x"]}, the name title at {name_title["x"]}'
assert abs(bubble['y'] - name_bubble['y']) <= 2, f'language bubble at y {bubble["y"]}, the name bubble at {name_bubble["y"]}'
assert_title_halo(ui, ui.snap('04-language'), title, 'language question')
other = ui.other_locale()
ui.tap_label(ui.t('languages.' + other))
ui.wait_label('language-done', lambda label: label == ui.t_in(other, 'account.language.done'), f'language did not switch to {other}')
ui.tap_label(ui.t('languages.' + ui.locale))
ui.wait_label('language-done', lambda label: label == before, 'language did not switch back')
ui.tap('language-done')

ui.element('home-scroll')
ui.capture('05-home')
open_me()
ui.wait_label('me-profile', lambda label: NAME in label, 'me does not show the saved name')

open_settings()
ui.wait_label('settings-profile', lambda label: NAME in label, 'settings does not show the saved name')
items = ui.read()
profile_row, avatar = by_id(items, 'settings-profile'), ui.t('account.name.avatar')
inside = [i for i in items if i.get('AXLabel') == avatar and profile_row['frame']['y'] <= i['frame']['y'] <= bottom(profile_row)]
assert inside or avatar in profile_row.get('AXLabel'), f'settings shows no avatar in the profile row: {profile_row.get("AXLabel")!r}'
ui.capture('06-settings')
for page in ('terms', 'privacy'):
    row = ui.element(f'settings-{page}')
    assert ui.t(f'account.legal.{page}.title') in (row.get('AXLabel') or ''), f'settings {page} row reads {row.get("AXLabel")!r}'
    assert_touch_target(row, f'settings-{page}')
    ui.tap(f'settings-{page}')
    ui.wait_label('legal-draft', lambda text: text.startswith(ui.t('account.legal.draft')), f'{page} page did not open from settings')
    ui.labelled(ui.t(f'account.legal.{page}.title'))
    ui.at_rest()
    ui.capture(f'06-settings-{page}')
    ui.tap_label(ui.t('account.legal.close'))
    ui.gone('legal-draft')
    ui.element('settings-sign-out')
ui.tap('settings-sign-out')
ui.gone('settings-sign-out')
ui.element('sign-in-apple')

sign_in()
ui.element('home-scroll')
open_me()
ui.wait_label('me-profile', lambda label: NAME in label, 'onboarded user did not go straight home')
open_settings()
ui.tap('settings-delete')
confirm = ui.element('delete-account-confirm')
assert_touch_target(confirm, 'delete button')
assert_touch_target(ui.element('delete-account-cancel'), 'cancel button')
labels = [i.get('AXLabel') or '' for i in ui.read()]
for item in (ui.t(f'account.delete.items.{key}') for key in DELETE_ITEMS):
    assert item in labels, f'delete confirmation does not list {item!r}: {labels}'
sheet = ui.element('delete-account-sheet')['frame']
symbols = [i.get('AXLabel') for i in ui.read() if i.get('type') == 'Image' and sheet['y'] <= i['frame']['y'] < confirm['frame']['y']]
assert not symbols, f'VoiceOver reads the decorative symbols in the delete sheet: {symbols}'
ui.capture('07-delete-sheet')
ui.tap('delete-account-confirm')
ui.gone('delete-account-confirm')
ui.element('sign-in-apple', timeout=10)
ui.at_rest()
ui.capture('08-deleted-welcome')

sign_in()
ui.wait(lambda items: any(i.get('AXUniqueId') == 'name-input' and '林小貘' in (i.get('AXValue') or '') for i in items),
        'a deleted account did not start onboarding again with a fresh profile')
print('PASS: onboarding, home, settings, sign out, sign in, delete and re-onboarding')
