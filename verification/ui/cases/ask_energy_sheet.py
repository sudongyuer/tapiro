"""小貘体力 in 问小貘 (135, 136, 138, 139, 140, 149). A full belly shows five segments beside 小貘; an answer takes a
third, so the bar drops to four, and tapping it explains the belly in a system alert. With one segment left the bar
turns orange and the sheet says 小貘 can help about once more. An empty belly shows the hungry card instead of a send:
with a leaf in the jar 喂一片嫩叶 feeds it (one call, the leaf flies to 小貘 in the recorded clip) and the bar is full
again; with no leaf, a coin swap asks first in a system action sheet and feeds at once; after five feeds today its one
title says 吃撑了 (not 饿了 over it) with only 自己填, filled as the primary; with nothing, 自己填 leads as the filled
primary (it moves the task on) and the grey 明早再来 under it closes the sheet. Empty belly pips keep a visible outline
on the glass in light and dark. A belly emptied by an answer brings the card
without another send."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
import recording  # noqa: E402
from ask import ai_calls, assert_calls, assert_lifted, open_sheet, turn, type_and_send  # noqa: E402
from bounty import relaunch, tap_sheet_action  # noqa: E402
from confirm import assert_dialog  # noqa: E402
from driver import UI, assert_colour, by_id, close, luma, reach_home, token  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskTapirSheet.tsx', 'src/app/ask.tsx', 'src/lib/i18n/locales/ask/',
        'src/ui/theme/tokens.ts', 'src/ui/PillButton.tsx', 'assets/pantry/', 'verification/ui/ask.py', 'verification/ui/confirm.py', 'src/ui/ConfirmDialog.tsx']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 600
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'given',
        '-uiVerifyAiDelayMs', '800', '-uiVerifyAiReplies', 'answer', '-uiVerifyAiBelly', '1000,0,0,5']
BELLY = ['-uiVerifyAiBelly', '1000,0,0,5']


def with_belly(value):
    relaunch(ui, drop=BELLY, add=['-uiVerifyAiBelly', value])
    open_sheet(ui)


BAR_WIDTH = 5 * 18 + 4 * 3
PIP_CONTRAST = 35
PIP_OUTLINE = 800
MOODS = {5: 'full', 4: 'ok', 3: 'ok', 2: 'half', 1: 'low', 0: 'hungry'}


def segments(ui, count, timeout=20):
    expected = ui.t('ask.belly.a11y', count=count, mood=ui.t(f'ask.belly.mood.{MOODS[count]}'))
    ui.wait_label('ask-belly', lambda label: label == expected, f'the belly does not read {expected}', timeout=timeout)


def first_segment(ui):
    f = by_id(ui.read(), 'ask-belly')['frame']
    return {'x': f['x'] + 3, 'y': f['y'] + f['height'] / 2 - 2, 'width': 12, 'height': 4}


def empty_outline(ui, shot):
    f = by_id(ui.read(), 'ask-belly')['frame']
    mid = f['y'] + f['height'] / 2
    above = sorted(luma(rgb) for rgb in shot.pixels({'x': f['x'], 'y': mid - 11, 'width': BAR_WIDTH, 'height': 3}))
    ground = above[len(above) // 2]
    edge = shot.count({'x': f['x'], 'y': mid - 6, 'width': BAR_WIDTH, 'height': 12},
                      lambda rgb: abs(luma(rgb) - ground) > PIP_CONTRAST)
    print(f'empty pips: {edge} outline pixels against glass luma {ground:.0f}')
    assert edge >= PIP_OUTLINE, f'the empty belly pips do not stand out from the glass ({edge} pixels) in {ui.appearance}'


def inked(shot, identifier):
    f = by_id(ui.read(), identifier)['frame']
    middle = {'x': f['x'] + 8, 'y': f['y'] + f['height'] / 2 - 6, 'width': f['width'] - 16, 'height': 12}
    ink = token('--color-accent', ui.appearance)
    return shot.count(middle, lambda rgb: close(rgb, ink, 24)) >= len(list(shot.pixels(middle))) * 0.5


def assert_inked(shot, identifier, name):
    assert inked(shot, identifier), f'{name} is not the filled ink primary'


def offer(ui, kind, label):
    ui.element(f'ask-hungry-{kind}', timeout=30)
    if label is None:
        assert by_id(ui.read(), 'ask-hungry-offer') is None, f'the {kind} card offers a button'
    else:
        ui.wait_label('ask-hungry-offer', lambda text: text == label, f'the {kind} card does not offer {label}')
        assert by_id(ui.read(), 'ask-hungry-offer')['frame']['height'] >= 44, 'the offer is under 44 pt'
    assert by_id(ui.read(), 'ask-manual') is not None, f'the {kind} card has no 自己填'


ui = UI(*sys.argv[1:])
reach_home(ui)
open_sheet(ui)
segments(ui, 5)
ui.wait_label('ask-belly-mood', lambda text: text == ui.t('ask.belly.mood.full'), 'a full belly is not 吃得饱饱的')
shot = ui.snap('01-full')
assert_colour(shot, first_segment(ui), token('--color-belly', ui.appearance), 'a full segment')
type_and_send(ui)
turn(ui, 1)
segments(ui, 4)
assert len(ai_calls(ui, 'status', 2, timeout=2)) == 1, 'the answer was followed by a second status read'
ui.tap('ask-belly')
ui.labelled(ui.t('ask.belly.aboutTitle'))
ui.at_rest()
ui.capture('02-about')
ui.tap_label(ui.t('ask.belly.aboutOk'))
ui.wait(lambda items: all(i.get('AXLabel') != ui.t('ask.belly.aboutTitle') for i in items), 'the alert stayed')

with_belly('150,0,0,5')
segments(ui, 1)
ui.wait_label('ask-belly-low', lambda text: text == ui.t('ask.belly.low'), 'the low line is missing')
ui.at_rest()
shot = ui.snap('03-low')
assert_colour(shot, first_segment(ui), token('--color-belly-low', ui.appearance), 'the last segment')
for identifier in ('ask-tapir-suggestion-0', 'ask-tapir-field'):
    assert_lifted(shot, by_id(ui.read(), identifier)['frame'], identifier)

with_belly('0,2,3,5')
segments(ui, 0)
offer(ui, 'feed', ui.t('ask.hungry.feed', count=2))
ui.wait_label('ask-hungry-line', lambda text: text == ui.t('ask.hungry.refill'), 'the refill line is missing')
ui.wait_label('ask-hungry-title', lambda text: text == ui.t('ask.hungry.title'), 'the hungry title is missing')
ui.at_rest()
shot = ui.snap('04-hungry-leaf')
empty_outline(ui, shot)
if ui.appearance == 'dark':
    card = by_id(ui.read(), 'ask-hungry-feed')['frame']
    head = {'x': card['x'] + card['width'] / 2 - 40, 'y': card['y'] + 4, 'width': 80, 'height': 80}
    saddle = token('--color-mascot-saddle', 'dark')
    # Without the outline the face alone has 375 such pixels (audit capture, 2026-11-17).
    rim = shot.count(head, lambda rgb: close(rgb, saddle, 12))
    assert rim >= 1000, f'小貘 on the hungry card has no outline in dark ({rim} saddle pixels)'
with recording.clip(ui, 'feed'):
    ui.tap('ask-hungry-offer')
    segments(ui, 5)
    ui.gone('ask-hungry-feed', timeout=10)
assert assert_calls(ui, 'pantry', 1, wait=1) == [{'kind': 'feed'}]
ui.at_rest()
ui.capture('05-fed')

with_belly('0,0,3,5')
offer(ui, 'swap', ui.t('ask.hungry.swap'))
ui.tap('ask-hungry-offer')
ui.labelled(ui.t('ask.hungry.swapTitle'))
assert_dialog(ui, ui.t('ask.hungry.swapTitle'), ui.t('ask.hungry.swapConfirm'), ui.t('ask.hungry.cancel'),
              source='ask-hungry-offer')
ui.capture('06-swap-confirm')
tap_sheet_action(ui, ui.t('ask.hungry.cancel'), 'ask-hungry-offer')
ui.element('ask-hungry-swap')
assert_calls(ui, 'pantry', 0, wait=1)
ui.tap('ask-hungry-offer')
tap_sheet_action(ui, ui.t('ask.hungry.swapConfirm'), 'ask-hungry-offer')
segments(ui, 5)
assert assert_calls(ui, 'pantry', 1, wait=1) == [{'kind': 'swapFeed'}]

with_belly('0,2,3,0')
offer(ui, 'capped', None)
ui.wait_label('ask-hungry-title', lambda text: text == ui.t('ask.hungry.capped'), 'the capped title is missing')
assert by_id(ui.read(), 'ask-hungry-line') is None, 'the capped card still has a second line under its title'
ui.at_rest()
assert_inked(ui.snap('07-capped'), 'ask-manual', 'the capped card\'s only 自己填')

with_belly('0,0,0,5')
offer(ui, 'tomorrow', ui.t('ask.hungry.tomorrow'))
ui.at_rest()
items = ui.read()
manual, later = (by_id(items, name)['frame'] for name in ('ask-manual', 'ask-hungry-offer'))
assert manual['y'] + manual['height'] <= later['y'], f'自己填 is not above 明早再来: {manual} {later}'
shot = ui.snap('08-nothing-left')
assert_inked(shot, 'ask-manual', '自己填 with nothing left')
assert not inked(shot, 'ask-hungry-offer'), '明早再来 is still the filled primary'
ui.tap('ask-hungry-offer')
ui.gone('ask-tapir-sheet')

with_belly('334,1,0,5')
segments(ui, 2)
assert by_id(ui.read(), 'ask-hungry-feed') is None, 'a belly with energy shows the hungry card'
type_and_send(ui)
turn(ui, 1)
segments(ui, 0)
offer(ui, 'feed', ui.t('ask.hungry.feed', count=1))
assert_calls(ui, 'ask', 1, wait=1)
print('PASS: belly bar full, after an answer, explained; low; hungry feed, swap, capped, nothing left; '
      'emptied by an answer')
