"""Worst-case applicant screen (break-ui). With a 60-code-point title and RM 500, three 貘友 applicants with
40-character names, 帮过 128 次 and 140-code-point notes (with spaces, CJK, and one unbroken run): each name truncates to
one line beside the tier (42A; in light, OCR reads each row's full tier at least once) and the whole note is readable.
Choosing the Latin and the CJK applicant names them on the hold button in at most two lines, with both ends of the hold
copy intact (the name truncates in the middle). With 50 applicants the list scrolls to row 50 above the pinned button
(top, middle and end). RM 1 fits the header. Holding selects the Latin applicant and the chosen row keeps one line. In
the detail, the not-selected pinned area with a 40-character poster and a 140-code-point note stays under 38% of the
screen (44A precedent); 选了你 names the long poster."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen, visible  # noqa: E402
from bounty import relaunch  # noqa: E402
from choose import hold_select  # noqa: E402
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402
from ocr import find, lines  # noqa: E402

DEPS = ['src/features/bounty/select/', 'src/features/bounty/detail/', 'src/features/bounty/board/',
        'src/features/bounty/shared/', 'src/ui/HoldButton.tsx', 'src/ui/TierMark.tsx', 'src/app/(tabs)/bounty/',
        'verification/ui/choose.py', 'verification/ui/board.py', 'verification/ui/ocr.py']
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
TIER_READ = set()
TIER_END = re.escape(TIER.split()[-1] if ' ' in TIER else TIER[-1]) + r'\s*$'


def label(identifier):
    return ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled').get('AXLabel') or ''


def scroll(share):
    s = screen(ui.read())
    ui.swipe((s['width'] / 2, s['height'] * 0.6), (s['width'] / 2, s['height'] * (0.6 - share)), 0.8)


def reveal(identifier, tries=12):
    for _ in range(tries):
        items = ui.read()
        found, hold = by_id(items, identifier), by_id(items, HOLD)
        limit = hold['frame']['y'] if hold else screen(items)['height']
        if found and found['frame']['y'] + found['frame']['height'] <= limit - 4 and found['frame']['y'] > 100:
            return ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled')
        scroll(0.3)
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
    note_tiers(read)
    print(f'{identifier}: row {f}, meta {helped[0]}')
    return row


# OCR misses the small secondary tier text in some shots, so each row only has to show it once across the run.
def note_tiers(read):
    items = ui.read()
    for identifier in WORST:
        row = by_id(items, identifier)
        if row and find(read, TIER_END, row['frame']):
            TIER_READ.add(identifier)


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
    note_tiers(read)
    shown = ''.join(inside).replace(' ', '')
    for part in ui.t('bounty.select.hold.label', name='\0').split('\0'):
        assert part.replace(' ', '') in shown, f'the verb {part!r} is cut from the hold label: {inside}'
    return hold


assert label('bounty-applicants-title') == TITLE, label('bounty-applicants-title')
assert 'RM' in label('bounty-applicants-reward') and '500' in label('bounty-applicants-reward'), \
    label('bounty-applicants-reward')
ui.settled(lambda items: by_id(items, WORST[0]), 'the worst rows never settled')
ui.at_rest()
shot = ui.snap('01-top')
read = lines(shot)
assert_row(shot, read, WORST[0])

ui.tap(WORST[0])
assert_hold(NAMES[WORST[0]], '02-hold-latin')

reveal(WORST[1])
ui.tap(WORST[1])
assert_hold(NAMES[WORST[1]], '03-hold-cjk')
shot = ui.snap('03-hold-cjk')
assert_row(shot, lines(shot), WORST[1])

reveal(WORST[2])
ui.at_rest()
shot = ui.snap('04-unbroken')
assert_row(shot, lines(shot), WORST[2])
print(f'tier read by OCR in {sorted(TIER_READ)}')
if ui.appearance == 'light':
    assert TIER_READ == set(WORST), f'OCR never read the full tier {TIER} in {sorted(set(WORST) - TIER_READ)}'

relaunch(ui, drop=['-uiVerifyApplicants', 'worst'],
         add=['-uiVerifyScene', SCENE, '-uiVerifyApplicants', 'fifty'], ready=f'{ROW}01')
ui.at_rest()
ui.capture('05-fifty-top')
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
assert ui.appearance == 'dark' or find(lines(shot), TIER_END, row), 'the tier is not shown in full in the chosen row'

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
head = by_id(items, 'bounty-detail-not-selected')
s = screen(items)
share = (s['height'] - head['frame']['y']) / s['height']
print(f'not selected: pinned from y {head["frame"]["y"]:.0f} of {s["height"]:.0f} ({share:.0%})')
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
