"""「收进贴纸本」 (73A, ruling 3). A tap writes exactly one collect; the sticker flies from the 已结清 card to the 我的 tab
and is over its icon before the card starts to leave, then the card fades away and the calm card takes its place.
With Reduce Motion (`-uiVerifyReduceMotion 1`, because simctl cannot switch the system setting) nothing reaches 我的:
the card and sticker fade in place, and one collect is still written. Both paths are read from clips
(`collect-flight.mp4`, `collect-reduced.mp4`) by frame timestamp. The landing haptic and the VoiceOver announcement
are on the device checklist."""
import json
import sys
import tempfile
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, Shot, assert_colour, by_id, reach_home, token  # noqa: E402
from recording import clip, frames  # noqa: E402

DEPS = [
    'src/features/home/',
    'src/lib/stickers/',
    'src/lib/uiVerify.ts',
    'src/ui/LiveCard.tsx',
    'src/ui/HandArt.tsx',
    'modules/tapiro-kit/',
    'verification/ui/recording.py',
]
BUDGET = 300
ARGS = ['-uiVerifySettled', 'one', '-uiVerifyShellFeed', 'none', '-uiVerifySignedIn', 'onboarded']
COLLECTED_KEY = 'uiVerifySettledCollected'
WATCH_S = 3.0
FRAME_GAP_S = 0.03
CHANGED = 48
TAB_HIT = 0.12
CARD_TOLERANCE = 24

ui = UI(*sys.argv[1:])


def collected():
    text = defaults(ui, COLLECTED_KEY)
    return json.loads(text) if text else []


def changed_share(shot, rest, f):
    a, b = list(shot.pixels(f)), list(rest.pixels(f))
    hits = sum(1 for p, q in zip(a, b) if max(abs(x - y) for x, y in zip(p, q)) > CHANGED)
    return hits / max(1, len(a))


def card_share(shot, start, f):
    a, b = list(shot.pixels(f)), list(start.pixels(f))
    same = sum(1 for p, q in zip(a, b) if max(abs(x - y) for x, y in zip(p, q)) <= CARD_TOLERANCE)
    return same / max(1, len(a))


def icon_box(tab):
    f = tab['frame']
    return {'x': f['x'], 'y': f['y'], 'width': f['width'], 'height': f['height'] * 0.6}


def button_band(button):
    return {'x': button['x'] + 16, 'y': button['y'] + button['height'] * 0.3, 'width': 40,
            'height': button['height'] * 0.4}


def collect_and_watch(name):
    ui.settled(lambda items: by_id(items, 'live-card-settled'), 'the 已结清 card is not in front')
    items = ui.read()
    tab = by_id(items, 'tab-me')
    assert tab, 'the 我的 tab is not on screen'
    ui.wait(lambda items: collected() == [] or None, f'a collect was written before the tap: {collected()}',
            timeout=15)
    button = ui.element('settled-card-collect')['frame']
    band = button_band(button)
    with clip(ui, name) as video:
        ui.axe('tap', '-x', str(round(button['x'] + button['width'] / 2)),
               '-y', str(round(button['y'] + button['height'] / 2)))
        time.sleep(WATCH_S)
    ui.settled(lambda items: by_id(items, 'live-card-calm'), 'the calm card did not replace the collected card')
    assert by_id(ui.read(), 'live-card-settled') is None, 'the collected card is still shown'
    ui.wait(lambda items: collected() == ['fixture-settled-0'] or None,
            f'expected exactly one collect, got {collected()}', timeout=15)
    width = items[0]['frame']['width']
    icon = icon_box(tab)
    with tempfile.TemporaryDirectory() as tmp:
        shots = [(Shot(path, width), at) for path, at in frames(video, tmp, FRAME_GAP_S)]
        start, rest = shots[0][0], shots[-1][0]
        assert_colour(start, band, token('--color-on-card-progress', ui.appearance), f'{name}: 收进贴纸本 button',
                      tolerance=16)
        rows = [(at, changed_share(shot, rest, icon), card_share(shot, start, band)) for shot, at in shots]
    print(f'{name}: ' + ', '.join(f'{at:.2f}s tab={t:.2f} card={c:.2f}' for at, t, c in rows))
    assert rows[0][2] > 0.8, f'{name}: the card is not on screen at the start of the clip: {rows[0]}'
    assert rows[-1][2] < 0.2, f'{name}: the card is still on screen at the end of the clip: {rows[-1]}'
    shown = max(i for i, (_, _, c) in enumerate(rows) if c >= 0.8)
    leaving = rows[shown + 1][0]
    gone = next(at for at, _, c in rows[shown + 1:] if c < 0.2)
    over_tab = [at for at, t, _ in rows if t >= TAB_HIT]
    return over_tab, leaving, gone


reach_home(ui)
ui.settled(lambda items: by_id(items, 'live-card-settled'), 'the 已结清 card is not in front')
ui.capture('01-before')
over_tab, leaving, gone = collect_and_watch('collect-flight')
assert over_tab, 'the sticker never reached the 我的 tab'
assert over_tab[0] < leaving, \
    f'the card started to leave at {leaving:.2f}s, before the sticker reached 我的 at {over_tab[0]:.2f}s'
print(f'flight: over 我的 {over_tab[0]:.2f}-{over_tab[-1]:.2f}s, card leaving {leaving:.2f}s, gone {gone:.2f}s')
ui.capture('02-collected')

relaunch(ui, drop=[], add=['-uiVerifyReduceMotion', '1'])
over_tab, leaving, gone = collect_and_watch('collect-reduced')
assert not over_tab, f'with Reduce Motion something reached the 我的 tab at {over_tab}'
print(f'reduced: card leaving {leaving:.2f}s, gone {gone:.2f}s')
ui.capture('03-reduced-collected')
