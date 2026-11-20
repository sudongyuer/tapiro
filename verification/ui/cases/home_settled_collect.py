"""「收进贴纸本」 (73A, ruling 3). A tap writes exactly one collect; the sticker flies from the 已结清 card to the 我的 tab
and is over its icon no later than the frame the card starts to leave (the same frame passes: owner ★, 2026-11-10),
then the card leaves upward (up 24 pt, scale 0.92, fade, 240 ms ease-out; ④A on the canvas) over the calm card, which rises from
behind; the change across the card is spread over at least LEAVE_MIN_S of frames, not one. The bounty board below
follows the taller calm card down over the restack spring (12 A): its offset, found frame by frame, takes at least
FOLLOW_MIN_S to cover the move. With Reduce Motion the board jumps.
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
GLYPH_MIN = 200
CARD_TOLERANCE = 24
LEAVE_MIN_S = 0.06
FOLLOW_MIN_S = 0.12
FOLLOW_JUMP_S = 0.07
FOLLOW_MIN_PT = 8
FOLLOW_SLACK_PT = 8

ui = UI(*sys.argv[1:])


def collected():
    text = defaults(ui, COLLECTED_KEY)
    return json.loads(text) if text else []


# The tab bar is glass: content scrolling behind it changes its backdrop, and the calm card is taller than the
# 已结清 card, so the board under the bar moves when the card goes (en dark: 0.19 of the whole icon box differed
# between the first and last frames with no sticker near, 2026-11-11). Only the 我的 glyph's own pixels, the
# brightest in dark and the darkest in light, are compared; the backdrop moved none of them.
def glyph_mask(rest, f):
    glyph = (lambda p: min(p) > 200) if ui.appearance == 'dark' else (lambda p: max(p) < 60)
    mask = [i for i, p in enumerate(rest.pixels(f)) if glyph(p)]
    assert len(mask) >= GLYPH_MIN, f'the 我的 glyph is not found in {f} ({len(mask)} pixels)'
    return mask


def changed_share(shot, rest, f, mask):
    a, b = list(shot.pixels(f)), list(rest.pixels(f))
    hits = sum(1 for i in mask if max(abs(x - y) for x, y in zip(a[i], b[i])) > CHANGED)
    return hits / len(mask)


def card_share(shot, start, f):
    a, b = list(shot.pixels(f)), list(start.pixels(f))
    same = sum(1 for p, q in zip(a, b) if max(abs(x - y) for x, y in zip(p, q)) <= CARD_TOLERANCE)
    return same / max(1, len(a))


# How far a frame has gone from the first frame to the last over the card, 0 to 1, by mean colour distance: a fade
# and a slide move it frame by frame, a card swapped in one frame jumps it (0.04 to 1.00 in 33 ms before the leave
# was kept on top, 2026-11-16).
def card_progress(shot, start, rest, f):
    now, a, b = list(shot.pixels(f)), list(start.pixels(f)), list(rest.pixels(f))
    away = sum(sum(abs(x - y) for x, y in zip(p, q)) for p, q in zip(now, a))
    left = sum(sum(abs(x - y) for x, y in zip(p, q)) for p, q in zip(now, b))
    return away / (away + left) if away + left else 0


def board_offset(shot, rest, band, reach):
    xs = range(round(band['x']), round(band['x'] + band['width']), 8)
    ys = range(round(band['y']), round(band['y'] + band['height']), 2)
    final = {(x, y): rest.rgb(x, y) for x in xs for y in range(ys.start - reach, ys.stop + reach)}
    now = [((x, y), shot.rgb(x, y)) for x in xs for y in ys]

    def error(d):
        return sum(sum(abs(a - b) for a, b in zip(p, final[(x, y + d)])) for (x, y), p in now) / len(now)

    return min((error(d), d) for d in range(-reach, reach + 1))


# The board's offset from where it rests, frame by frame: each frame's band under the board title is matched against
# the last frame's shifted by d points. A board that jumps covers the move between two frames.
def board_follow(shots, start_at, title_before, title_after, width):
    move = round(title_after['y'] - title_before['y'])
    assert move >= FOLLOW_MIN_PT, f'the board moved {move} pt; the calm card should push it down'
    band = {'x': 16, 'y': title_after['y'], 'width': width - 32, 'height': 60}
    rest = shots[-1][0]
    rows = [(at, *board_offset(shot, rest, band, move + FOLLOW_SLACK_PT))
            for shot, at in shots if start_at - 0.1 <= at <= start_at + 1.2]
    print('board offset ' + ', '.join(f'{at:.2f}s {d}pt (err {e:.0f})' for at, e, d in rows))
    covered = [(at, 1 - d / move) for at, _, d in rows]
    last = next(i for i in range(len(covered)) if all(p >= 0.95 for _, p in covered[i:]))
    began = next(at for at, p in covered[:last + 1] if p >= 0.1)
    return covered[last][0] - began


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
    card = by_id(items, 'live-card-settled')['frame']
    title_before = by_id(items, 'bounty-board-title')['frame']
    band = button_band(button)
    with clip(ui, name) as video:
        ui.axe('tap', '-x', str(round(button['x'] + button['width'] / 2)),
               '-y', str(round(button['y'] + button['height'] / 2)))
        time.sleep(WATCH_S)
    ui.settled(lambda items: by_id(items, 'live-card-calm'), 'the calm card did not replace the collected card')
    assert by_id(ui.read(), 'live-card-settled') is None, 'the collected card is still shown'
    ui.wait(lambda items: collected() == ['fixture-settled-0'] or None,
            f'expected exactly one collect, got {collected()}', timeout=15)
    title_after = ui.element('bounty-board-title')['frame']
    width = items[0]['frame']['width']
    icon = icon_box(tab)
    with tempfile.TemporaryDirectory() as tmp:
        shots = [(Shot(path, width), at) for path, at in frames(video, tmp, FRAME_GAP_S)]
        start, rest = shots[0][0], shots[-1][0]
        assert_colour(start, band, token('--color-on-card-progress', ui.appearance), f'{name}: 收进贴纸本 button',
                      tolerance=16)
        mask = glyph_mask(rest, icon)
        rows = [(at, changed_share(shot, rest, icon, mask), card_share(shot, start, band)) for shot, at in shots]
        progress = [(at, card_progress(shot, start, rest, card)) for shot, at in shots]
        print(f'{name}: ' + ', '.join(f'{at:.2f}s tab={t:.2f} card={c:.2f}' for at, t, c in rows))
        assert rows[0][2] > 0.8, f'{name}: the card is not on screen at the start of the clip: {rows[0]}'
        assert rows[-1][2] < 0.2, f'{name}: the card is still on screen at the end of the clip: {rows[-1]}'
        assert rows[0][1] < TAB_HIT, \
            f'{name}: the 我的 tab already differs from its resting look at the start: {rows[0]}'
        shown = max(i for i, (_, _, c) in enumerate(rows) if c >= 0.8)
        follow = board_follow(shots, rows[shown][0], title_before, title_after, width)
    leaving = rows[shown + 1][0]
    gone = next(at for at, _, c in rows[shown + 1:] if c < 0.2)
    over_tab = [at for at, t, _ in rows if t >= TAB_HIT]
    after = [(at, p) for at, p in progress if at >= rows[shown][0]]
    began = next(at for at, p in after if p >= 0.1)
    settled = next(at for at, p in after if p >= 0.9)
    print(f'{name}: card change ' + ', '.join(f'{at:.2f}s {p:.2f}' for at, p in after if at <= settled + 0.1))
    return over_tab, leaving, gone, settled - began, follow


reach_home(ui)
ui.settled(lambda items: by_id(items, 'live-card-settled'), 'the 已结清 card is not in front')
ui.capture('01-before')
over_tab, leaving, gone, span, follow = collect_and_watch('collect-flight')
assert over_tab, 'the sticker never reached the 我的 tab'
assert over_tab[0] <= leaving, \
    f'the card started to leave at {leaving:.2f}s, before the sticker reached 我的 at {over_tab[0]:.2f}s'
assert span >= LEAVE_MIN_S, f'the card left in {span:.2f}s, not over the 240 ms leave'
assert follow >= FOLLOW_MIN_S, f'the board below jumped to its new place in {follow:.2f}s, not over the restack spring'
print(f'flight: over 我的 {over_tab[0]:.2f}-{over_tab[-1]:.2f}s, card leaving {leaving:.2f}s, gone {gone:.2f}s, '
      f'change over {span:.2f}s, board followed over {follow:.2f}s')
ui.capture('02-collected')

relaunch(ui, drop=[], add=['-uiVerifyReduceMotion', '1'])
over_tab, leaving, gone, _, follow = collect_and_watch('collect-reduced')
assert not over_tab, f'with Reduce Motion something reached the 我的 tab at {over_tab}'
assert follow <= FOLLOW_JUMP_S, f'with Reduce Motion the board moved over {follow:.2f}s instead of jumping'
print(f'reduced: card leaving {leaving:.2f}s, gone {gone:.2f}s, board moved over {follow:.2f}s')
ui.capture('03-reduced-collected')
