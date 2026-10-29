"""Applicant screen 6A pushed from the bounty-applicants scene with a back button to 悬赏令: the header shows 帮取快递, 等你选人 · 3 人申请 and RM 8; the grouped list holds 阿杰, Hana and Aiman in application order, each with the tier and 帮过 N 次 or 还没帮过 (阿杰 also with his note); before a choice the pinned hold button reads 先选一个人 and is disabled, with the hint counting the other 2; tapping Hana puts the accent checkmark on Hana only and names her on the button, tapping 阿杰 moves the check; rows and the button are at least 44 pt. A pull on the list brings in Mei Ling, who applied
after it loaded, below the other three and counts 4 人申请. With no applicants the header reads 等人申请 with one inline card and no button; a failed first load shows 没加载出来 and a status line without a count, and 重试 loads the three rows."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import ink_box, screen  # noqa: E402
from bounty import assert_grouped_background, relaunch  # noqa: E402
from driver import UI, assert_colour, assert_touch_target, by_id, token  # noqa: E402

DEPS = ['src/features/bounty/select/', 'src/features/bounty/shared/', 'src/features/bounty/board/', 'src/ui/TierMark.tsx', 'src/ui/HoldButton.tsx', 'src/app/(tabs)/bounty/']
SCENE = 'bounty-applicants'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded']
JIE, HANA, AIMAN, MEI = (f'bounty-applicant-fixture-applicant-{name}' for name in ('jie', 'hana', 'aiman', 'mei'))
HOLD = 'bounty-select-hold'
CHECK_SIZE = 17
CHECK_INSET = 18
CHECK_TOP = (6, 40)
CHECK_SLACK = 4
CHECK_MIN = 12
CHECK_SPAN = (8, CHECK_SIZE + CHECK_SLACK)
FOOTER_PAD = 12

ui = UI(*sys.argv[1:])


def label(identifier):
    return ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled').get('AXLabel') or ''


def rows():
    ui.settled(lambda items: by_id(items, AIMAN), 'the applicant rows never settled')
    items = ui.read()
    return [by_id(items, identifier) for identifier in (JIE, HANA, AIMAN)]


def hold_reads(expected):
    return ui.wait_label(HOLD, lambda text: text == expected, f'the hold button does not read {expected!r}')


def check_ink(shot, row, cutoff):
    f = row['frame']
    right = f['x'] + f['width'] - CHECK_INSET + CHECK_SLACK
    left = right - CHECK_SIZE - 2 * CHECK_SLACK
    top, bottom = f['y'] + CHECK_TOP[0], min(f['y'] + CHECK_TOP[1], cutoff)
    if bottom <= top:
        return None
    box = {'x': left, 'y': top, 'width': right - left, 'height': bottom - top}
    return ink_box(shot, box, token('--color-accent', ui.appearance), 40)


def assert_checked(name, chosen):
    ui.at_rest()
    shot = ui.snap(name)
    cutoff = ui.element(HOLD)['frame']['y'] - FOOTER_PAD
    for row in rows():
        found = check_ink(shot, row, cutoff)
        ink = found['count'] if found else 0
        print(f'{name}: {row["AXUniqueId"]} check box ink {found}')
        if row['AXUniqueId'] == chosen:
            assert ink >= CHECK_MIN, f'{chosen} has no accent checkmark ({ink} px)'
            for side in ('width', 'height'):
                assert CHECK_SPAN[0] <= found[side] <= CHECK_SPAN[1], \
                    f'the ink on {chosen} is {found[side]:.1f} pt {side}, not a {CHECK_SIZE} pt checkmark: {found}'
        else:
            assert ink < CHECK_MIN, f'{row["AXUniqueId"]} still shows a checkmark ({ink} px) while {chosen} is chosen'
    return shot


jie, hana, aiman = rows()
assert jie['frame']['y'] < hana['frame']['y'] < aiman['frame']['y'], 'the rows are not in application order'
for row, name, tier, meta in (
    (jie, '阿杰', 'very_reliable', ui.tn('bounty.select.meta.helped', 14)),
    (hana, 'Hana', 'new_friend', ui.t('bounty.select.meta.neverHelped')),
    (aiman, 'Aiman', 'reliable', ui.tn('bounty.select.meta.helped', 3)),
):
    expected = ui.t('bounty.select.a11y.row', name=name, tier=ui.t(f'bounty.tier.{tier}'), meta=meta)
    assert (row.get('AXLabel') or '').startswith(expected), f'{name} row reads {row.get("AXLabel")!r}, expected {expected!r}'
    assert_touch_target(row, f'{name} row')
assert '我就在 Sunway Geo 楼下' in (jie.get('AXLabel') or ''), f'阿杰 row has no note: {jie.get("AXLabel")!r}'
back = [i.get('AXLabel') for i in ui.read() if i.get('type') == 'Button' and i['frame']['y'] < 120]
assert ui.t('shell.home.title') in back, f'no back button to {ui.t("shell.home.title")} in the header: {back}'
assert label('bounty-applicants-title') == '帮取快递', label('bounty-applicants-title')
assert label('bounty-applicants-status') == ui.tn('bounty.select.statusOpen', 3), label('bounty-applicants-status')
assert re.search(r'RM\s?8$', label('bounty-applicants-reward')), label('bounty-applicants-reward')

hold = hold_reads(ui.t('bounty.select.hold.none'))
assert hold.get('enabled') is False, f'the hold button is enabled before a choice: {hold}'
assert_touch_target(hold, 'hold button')
hint_text = ui.tn('bounty.select.hold.hint', 2)
assert label(f'{HOLD}-hint') == hint_text, label(f'{HOLD}-hint')
shot = assert_checked('01-no-choice', None)
f = hold['frame']
assert_grouped_background(ui, shot, {'x': 0, 'y': f['y'], 'width': 12, 'height': f['height']}, 'pinned footer')

ui.tap(HANA)
hold = hold_reads(ui.t('bounty.select.hold.label', name='Hana'))
assert hold.get('enabled') is True, f'the hold button stays disabled after a choice: {hold}'
assert_checked('02-hana', HANA)

ui.tap(JIE)
hold = hold_reads(ui.t('bounty.select.hold.label', name='阿杰'))
shot = assert_checked('03-jie', JIE)
assert label(f'{HOLD}-hint') == hint_text, label(f'{HOLD}-hint')
f = hold['frame']
track = {'x': f['x'] + f['height'] / 2, 'y': f['y'] + f['height'] / 2 - 6, 'width': 14, 'height': 12}
assert_colour(shot, track, token('--color-hold-track', ui.appearance), 'hold track', tolerance=10)
print(f'list: hold {f["width"]:.0f} x {f["height"]:.0f} pt at y {f["y"]:.1f}')

relaunch(ui, drop=[], add=['-uiVerifyScene', SCENE, '-uiVerifyApplicants', 'grows'], ready=JIE)
rows()
ui.at_rest()
assert by_id(ui.read(), MEI) is None, 'Mei Ling is listed before the pull'
assert label('bounty-applicants-status') == ui.tn('bounty.select.statusOpen', 3), label('bounty-applicants-status')
s = screen(ui.read())
ui.swipe((s['width'] / 2, s['height'] * 0.3), (s['width'] / 2, s['height'] * 0.8), 0.6)
ui.wait_label('bounty-applicants-status', lambda text: text == ui.tn('bounty.select.statusOpen', 4),
              'the status does not count 4 applicants after the pull')
ui.at_rest()
ui.swipe((s['width'] / 2, s['height'] * 0.6), (s['width'] / 2, s['height'] * 0.3), 0.8)
mei = ui.settled(lambda items: by_id(items, MEI), 'the pull never brought in Mei Ling')
jie, hana, aiman = rows()
assert jie['frame']['y'] < hana['frame']['y'] < aiman['frame']['y'] < mei['frame']['y'], \
    'after the pull the rows are not in application order'
expected = ui.t('bounty.select.a11y.row', name='Mei Ling', tier=ui.t('bounty.tier.reliable'),
                meta=ui.tn('bounty.select.meta.helped', 5))
assert (mei.get('AXLabel') or '').startswith(expected), f'Mei Ling reads {mei.get("AXLabel")!r}'
assert by_id(ui.read(), 'bounty-applicants-stale') is None, 'a successful pull shows the stale notice'
ui.at_rest()
ui.capture('04-pulled')

relaunch(ui, drop=[], add=['-uiVerifyScene', SCENE, '-uiVerifyApplicants', 'none'], ready='bounty-applicants-empty')
assert label('bounty-applicants-status') == ui.t('bounty.select.statusEmpty'), label('bounty-applicants-status')
assert ui.t('bounty.select.empty.title') in label('bounty-applicants-empty'), label('bounty-applicants-empty')
items = ui.read()
assert by_id(items, HOLD) is None, 'the hold button is shown with no applicants'
assert by_id(items, JIE) is None, 'rows are shown with no applicants'
ui.at_rest()
ui.capture('05-empty')

relaunch(ui, drop=[], add=['-uiVerifyScene', SCENE, '-uiVerifyApplicantsFail', 'first'], ready='bounty-applicants-failed')
assert label('bounty-applicants-failed') == ui.t('bounty.select.failed'), label('bounty-applicants-failed')
assert label('bounty-applicants-status') == ui.t('bounty.select.statusOpenNoCount'), label('bounty-applicants-status')
items = ui.read()
for absent in (HOLD, 'bounty-applicants-empty', JIE):
    assert by_id(items, absent) is None, f'a failed first load still shows {absent}'
ui.at_rest()
ui.capture('06-failed')
ui.tap('bounty-applicants-retry')
rows()
ui.gone('bounty-applicants-failed')
assert label('bounty-applicants-status') == ui.tn('bounty.select.statusOpen', 3), label('bounty-applicants-status')
hold_reads(ui.t('bounty.select.hold.none'))
ui.at_rest()
ui.capture('07-retried')
print('PASS: three rows in order, Q46 button, check moves, a pull adds Mei Ling, empty and failed first load')
