"""Worst-case applicant screen (break-ui). With a 60-code-point title and RM 500, three 貘友 applicants with
40-character names, 帮过 128 次 and 140-code-point notes (with spaces, CJK, and one unbroken run): each name truncates to
one line beside the tier (42A; the tier's ink is as wide as beside a short name) and the whole note is readable.
Choosing the Latin and the CJK applicant names them on the hold button in at most two lines, with both ends of the hold
copy intact (the name truncates in the middle). With 50 applicants the list scrolls to row 50 above the pinned button
(top, middle and end). RM 1 fits the header. Holding selects the Latin applicant and the chosen row keeps one line. In
the detail, the not-selected pinned area with a 40-character poster and a 140-code-point note stays under 38% of the
screen (44A precedent); 选了你 names the long poster. In dark the tier text keeps 4.5:1 against the row and the tier
heads carry their saddle outline (56A) at 3:1 or more, both measured from pixels."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen, visible  # noqa: E402
from bounty import relaunch  # noqa: E402
from choose import hold_select  # noqa: E402
from driver import UI, assert_touch_target, by_id, dominant, reach_home  # noqa: E402
from gestures import drag  # noqa: E402
from ocr import find, lines, lines_in  # noqa: E402

DEPS = ['src/features/bounty/select/', 'src/features/bounty/detail/', 'src/features/bounty/board/',
        'src/features/bounty/shared/', 'src/ui/HoldButton.tsx', 'src/ui/TierMark.tsx', 'src/ui/Mascot.tsx',
        'src/app/(tabs)/bounty/',
        'verification/ui/choose.py', 'verification/ui/board.py', 'verification/ui/ocr.py', 'src/features/place/', 'src/features/block/']
SCENE = 'bounty-applicants'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 600
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBoard', 'worst',
        '-uiVerifyDetailId', 'fixture-worst-01', '-uiVerifyApplicants', 'worst']
HOLD = 'bounty-select-hold'
ROW = 'bounty-applicant-fixture-applicant-'
WORST = [f'{ROW}worst-{kind}' for kind in ('latin', 'cjk', 'unbroken')]
HOLD_MAX_PT = 72
META_TOP_PT = 50
PINNED_MAX_SHARE = 0.38
DONE_ROW_MAX_PT = 76
TEXT_CONTRAST_MIN = 4.5
CHECK_LANE_PT = 24
TIER_TAIL_PT = 14
INK_CONTRAST = 1.5
TIER_SLACK_PT = 2
NAME_LINE_PT = 24
NON_TEXT_CONTRAST_MIN = 3
HEAD_PITCH_PT = 13
HEAD_PITCH_SLACK_PT = 0.7
HEAD_CHAIN = 3
HEAD_RANK = 4
HEAD_OUTLINE_MIN_PT2 = 12
REFERENCE = f'{ROW}04'

ui = UI(*sys.argv[1:])


def code_points(seed, count):
    return ''.join(list(seed * (count // len(seed) + 1))[:count])


NAMES = {
    WORST[0]: code_points('Muhammad Hafiz Haikal bin Mohd Yusof Ali ', 40),
    WORST[1]: code_points('欧阳慕容司马诸葛上官', 40),
    WORST[2]: code_points('Abcdefghijklmnopqrstuvwxyz', 40),
}
NOTES = {
    WORST[0]: code_points('Saya di lobi Sunway Geo Residences sekarang, boleh sampai dalam 10 minit dengan troli. ', 140),
    WORST[1]: code_points('我有推车可以帮你把三个行李箱搬上二十三楼到了先给你发消息', 140),
    WORST[2]: code_points('Sunway🧋Pyramid', 140),
}
TITLE = code_points('帮我从 Sunway Pyramid 搬三个很重的行李箱到宿舍二十三楼，', 60)
TIER = ui.t('bounty.tier.tapir_friend')
TIER_SPANS = {}


def label(identifier):
    return ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled').get('AXLabel') or ''


def scroll(share):
    s = screen(ui.read())
    drag(ui, (s['width'] / 2, s['height'] * 0.6), (s['width'] / 2, s['height'] * (0.6 - share)))


def reveal(identifier, tries=12):
    for _ in range(tries):
        ui.at_rest()
        items = ui.read()
        found, hold = by_id(items, identifier), by_id(items, HOLD)
        limit = hold['frame']['y'] if hold else screen(items)['height']
        if found and found['frame']['y'] + found['frame']['height'] <= limit - 4 and found['frame']['y'] > 100:
            return found
        scroll(-0.2 if found and found['frame']['y'] <= 100 else 0.3)
    raise AssertionError(f'{identifier} never scrolled fully above the hold button')


def assert_row(shot, read, identifier):
    row = ui.element(identifier)
    f = row['frame']
    name = NAMES[identifier]
    meta = ui.tn('bounty.select.meta.helped', 128)
    expected = ui.t('bounty.select.a11y.row', name=name, tier=TIER, meta=meta)
    assert (row.get('AXLabel') or '').startswith(expected), f'{identifier} reads {row.get("AXLabel")!r}'
    assert NOTES[identifier].strip() in (row.get('AXLabel') or ''), f'{identifier} label lacks the full note'
    assert_touch_target(row, identifier)
    helped = find(read, meta.replace(' ', r'\s?'), f)
    assert helped, f'{meta} is not shown in {identifier}: {[l["text"] for l in read]}'
    assert helped[0]['y'] - f['y'] <= META_TOP_PT, \
        f'{meta} sits {helped[0]["y"] - f["y"]:.0f} pt into {identifier}: the name wraps instead of truncating'
    TIER_SPANS[identifier] = tier_span(shot, f, f['y'] + NAME_LINE_PT)
    print(f'{identifier}: row {f}, meta {helped[0]}, tier {TIER_SPANS[identifier]:.1f} pt')
    if ui.appearance == 'dark':
        ratio = tier_text_contrast(shot, f, helped[0]['y'])
        print(f'{identifier}: dark tier text contrast {ratio:.2f}:1')
        assert ratio >= TEXT_CONTRAST_MIN, f'the tier text in {identifier} is {ratio:.2f}:1 in dark'
        area, outline = head_outline(shot, f, f['y'] + NAME_LINE_PT)
        print(f'{identifier}: dark tier heads {area:.1f} pt2 of ink at {NON_TEXT_CONTRAST_MIN}:1 or more, '
              f'outline {outline:.2f}:1')
        assert area >= HEAD_RANK * HEAD_OUTLINE_MIN_PT2, \
            f'the tier heads in {identifier} have {area:.1f} pt2 of ink at 3:1 in dark: no saddle outline'
        assert outline >= NON_TEXT_CONTRAST_MIN, f'the tier head outline in {identifier} is {outline:.2f}:1 in dark'
    return row


def relative_luminance(rgb):
    def channel(value):
        c = value / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(v) for v in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = sorted((relative_luminance(a), relative_luminance(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


# The tier text is the rightmost ink on the name line once the checkmark lane is left out.
def tier_text_contrast(shot, f, meta_y):
    band = {'x': f['x'] + 60, 'y': f['y'] + 4, 'width': f['width'] - 60 - CHECK_LANE_PT,
            'height': meta_y - f['y'] - 6}
    background = dominant(shot, band)
    x0, x1 = round(band['x'] * shot.scale), round((band['x'] + band['width']) * shot.scale)
    y0, y1 = round(band['y'] * shot.scale), round((band['y'] + band['height']) * shot.scale)
    columns = {x: [shot._px(x, y) for y in range(y0, y1)] for x in range(x0, x1)}
    inked = [x for x, column in columns.items() if any(contrast(rgb, background) > INK_CONTRAST for rgb in column)]
    assert inked, f'no ink on the name line of {f}'
    right = max(inked)
    tail = [rgb for x in range(right - round(TIER_TAIL_PT * shot.scale), right + 1) for rgb in columns[x]]
    return max(contrast(rgb, background) for rgb in tail)


def ink_runs(ink):
    runs, start = [], None
    for i, inked in enumerate(ink + [False]):
        if inked and start is None:
            start = i
        elif not inked and start is not None:
            runs.append((start, i))
            start = None
    return runs


# The heads are the rightmost chain of at least HEAD_CHAIN equal-width ink runs at HEAD_PITCH_PT; the tier starts
# HEAD_RANK - 1 pitches left of the chain's last head and ends at the last ink before the check lane. The name's gap
# to the first head (6 pt beside 「Siti 4」) is as wide as the gaps between heads, so a gap rule cannot split them.
def tier_bounds(shot, f, bottom, lane=CHECK_LANE_PT):
    band = {'x': f['x'], 'y': f['y'] + 4, 'width': f['width'] - lane, 'height': bottom - f['y'] - 4}
    background = dominant(shot, band)
    x0, x1 = round(band['x'] * shot.scale), round((band['x'] + band['width']) * shot.scale)
    y0, y1 = round(band['y'] * shot.scale), round((band['y'] + band['height']) * shot.scale)
    ink = [any(contrast(shot._px(x, y), background) > INK_CONTRAST for y in range(y0, y1)) for x in range(x0, x1)]
    runs = ink_runs(ink)
    assert runs, f'no ink on the name line of {f}'
    pitch, slack = HEAD_PITCH_PT * shot.scale, HEAD_PITCH_SLACK_PT * shot.scale
    last = None
    for end in range(len(runs) - 1, HEAD_CHAIN - 2, -1):
        chain = runs[end - HEAD_CHAIN + 1:end + 1]
        width = chain[-1][1] - chain[-1][0]
        if all(abs((b[0] - a[0]) - pitch) <= slack for a, b in zip(chain, chain[1:])) \
                and all(abs((r[1] - r[0]) - width) <= slack for r in chain):
            last = chain[-1]
            break
    assert last, f'no {HEAD_CHAIN} heads at {HEAD_PITCH_PT} pt on the name line of {f}: runs {runs}'
    left = last[0] - round((HEAD_RANK - 1) * pitch)
    return {'left': x0 + left, 'right': x0 + runs[-1][1] - 1, 'y0': y0, 'y1': y1, 'background': background}


def tier_span(shot, f, bottom, lane=CHECK_LANE_PT):
    bounds = tier_bounds(shot, f, bottom, lane)
    return (bounds['right'] - bounds['left'] + 1) / shot.scale


# Non-text contrast of the heads (WCAG 1.4.11): the heads are the first HEAD_RANK * HEAD_PITCH_PT of the tier. Without the
# saddle outline only the eye whites and ear rims reach 3:1 (a few pt2 per head); the outline adds a 1 pt ring.
def head_outline(shot, f, bottom):
    bounds = tier_bounds(shot, f, bottom)
    background = bounds['background']
    x1 = bounds['left'] + round((HEAD_RANK * HEAD_PITCH_PT - 1) * shot.scale)
    light = [contrast(shot._px(x, y), background) for x in range(bounds['left'], x1)
             for y in range(bounds['y0'], bounds['y1'])]
    light = sorted(ratio for ratio in light if ratio >= NON_TEXT_CONTRAST_MIN)
    if not light:
        return 0, 0
    return len(light) / shot.scale ** 2, light[len(light) // 2]


# Vision OCR misreads glyphs on the dark hold button (按 as 接, Tahan as Tanan, pilih as piih on iOS 27.2), so each end
# of the label is matched with the two name characters beside it, allowing one edit per five characters (at least one):
# a cut verb takes the start of the name with it, and the name's middle ellipsis keeps both of its ends.
def appears(part, text):
    slack = max(1, len(part) // 5) if len(part) >= 4 else 0
    row = [0] * (len(text) + 1)
    for i, a in enumerate(part, 1):
        diagonal, row[0] = row[0], i
        for j, b in enumerate(text, 1):
            diagonal, row[j] = row[j], min(row[j] + 1, row[j - 1] + 1, diagonal + (a != b))
    return min(row) <= slack


def assert_hold(name, shot_name):
    hold = ui.wait_label(HOLD, lambda text: text == ui.t('bounty.select.hold.label', name=name),
                         'the hold button does not name the chosen applicant')
    f = hold['frame']
    assert f['height'] <= HOLD_MAX_PT, f'the hold button grew to {f["height"]:.0f} pt with a 40-character name'
    ui.at_rest()
    shot = ui.snap(shot_name)
    read = lines(shot)
    inside = [line['text'] for line in read if find([line], '.', f)]
    print(f'{shot_name}: hold {f}, text {inside}')
    shown = ''.join(inside).replace(' ', '')
    head, tail = (part.replace(' ', '') for part in ui.t('bounty.select.hold.label', name='\0').split('\0'))
    compact = name.replace(' ', '')
    for end in (head + compact[:2], compact[-2:] + tail):
        assert appears(end, shown), f'{end!r} is cut from the hold label: {inside}'
    return hold


assert label('bounty-applicants-title') == TITLE, label('bounty-applicants-title')
assert 'RM' in label('bounty-applicants-reward') and '500' in label('bounty-applicants-reward'), \
    label('bounty-applicants-reward')
ui.settled(lambda items: by_id(items, WORST[0]), 'the worst rows never settled')
ui.at_rest()
shot = ui.snap('01-top')
read = lines_in(shot, ui.locale)
assert_row(shot, read, WORST[0])

ui.tap(WORST[0])
assert_hold(NAMES[WORST[0]], '02-hold-latin')

reveal(WORST[1])
ui.tap(WORST[1])
assert_hold(NAMES[WORST[1]], '03-hold-cjk')
shot = ui.snap('03-hold-cjk')
assert_row(shot, lines_in(shot, ui.locale), WORST[1])

reveal(WORST[2])
ui.at_rest()
shot = ui.snap('04-unbroken')
assert_row(shot, lines_in(shot, ui.locale), WORST[2])

relaunch(ui, drop=['-uiVerifyApplicants', 'worst'],
         add=['-uiVerifyScene', SCENE, '-uiVerifyApplicants', 'fifty'], ready=f'{ROW}01')
ui.at_rest()
ui.capture('05-fifty-top')
reveal(REFERENCE)
ui.at_rest()
shot = ui.snap('05-fifty-reference')
f = ui.element(REFERENCE)['frame']
assert TIER in (ui.element(REFERENCE).get('AXLabel') or ''), f'{REFERENCE} is not a {TIER} row'
reference_span = tier_span(shot, f, f['y'] + NAME_LINE_PT)
print(f'reference tier beside a short name: {reference_span:.1f} pt')
reveal(f'{ROW}25')
ui.at_rest()
ui.capture('06-fifty-middle')
last = reveal(f'{ROW}50', tries=30)
ui.at_rest()
items = ui.read()
hold = by_id(items, HOLD)
assert hold, 'the hold button is not pinned at the end of the list'
assert last['frame']['y'] + last['frame']['height'] <= hold['frame']['y'], f'row 50 sits under the button: {last}'
ui.capture('07-fifty-end')

relaunch(ui, drop=['-uiVerifyDetailId', 'fixture-worst-01'],
         add=['-uiVerifyScene', SCENE, '-uiVerifyDetailId', 'fixture-worst-02'], ready=WORST[0])
reward = label('bounty-applicants-reward')
assert 'RM' in reward and '1' in reward and '100' not in reward, reward
ui.at_rest()
ui.capture('08-rm1')

ui.tap(WORST[0])
assert_hold(NAMES[WORST[0]], '09-before-hold')
hold_select(ui)
ui.element('bounty-select-done-row', timeout=40)
done = label('bounty-select-done-row')
assert NAMES[WORST[0]].strip() in done and TIER in done, f'the chosen row reads {done!r}'
ui.at_rest()
shot = ui.snap('10-done')
row = ui.element('bounty-select-done-row')['frame']
print(f'chosen row: {row}')
assert row['height'] <= DONE_ROW_MAX_PT, f'the chosen name wraps instead of truncating: {row}'
TIER_SPANS['chosen row'] = tier_span(shot, row, row['y'] + row['height'] - 4, lane=0)
for where, width in TIER_SPANS.items():
    assert abs(width - reference_span) <= TIER_SLACK_PT, \
        f'the tier in {where} is {width:.1f} pt wide, {reference_span:.1f} pt beside a short name: it gave up width'

OUTCOME_DROP = ['-uiVerifyDetailId', 'fixture-worst-01']
relaunch(ui, drop=OUTCOME_DROP, add=['-uiVerifyDetailId', 'fixture-worst-02', '-uiVerifyDetail', 'notSelected'])
reach_home(ui)
card = visible(ui, 'bounty-card-fixture-worst-02')
ui.at_rest()
f = card['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
ui.element('bounty-detail-not-selected')
ui.at_rest()
items = ui.read()
browse = by_id(items, 'bounty-detail-browse')
content = by_id(items, 'bounty-detail')['frame']
pinned_top = content['y'] + content['height']
s = screen(items)
share = (s['height'] - pinned_top) / s['height']
print(f'not selected: pinned from y {pinned_top:.0f} of {s["height"]:.0f} ({share:.0%})')
assert_touch_target(browse, 'browse')
ui.capture('11-not-selected')
assert share <= PINNED_MAX_SHARE, f'the not-selected pinned area takes {share:.0%} of the screen'

relaunch(ui, drop=OUTCOME_DROP, add=['-uiVerifyDetailId', 'fixture-worst-02', '-uiVerifyDetail', 'selected'])
reach_home(ui)
card = visible(ui, 'bounty-card-fixture-worst-02')
ui.at_rest()
f = card['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
ui.element('bounty-detail-selected')
ui.at_rest()
ui.capture('12-selected')
print('PASS: worst applicant rows, hold label, fifty rows, RM 1, chosen row, both outcomes')
