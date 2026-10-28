"""Worst-case board (break-ui): with 45 bounties of 60-code-point titles, 80-code-point places and 40-character names,
RM 500 sits inside the card beside a title that wraps to two lines; the place line truncates the label but always shows
the distance (100 m, 1.8 km, 18 km); 申请 stays a 44 pt pill beside the 貘友 poster; the applied card shows 已申请 · 等对方选
in full; the first page already reads the exact 「+42 更远」 (42 located bounties beyond 2 km), which fits the axis;
the list loads all 45 cards and ends with 没写地点. The detail of the first card and the apply sheet with a 140-code-point note with spaces (`-uiVerifyApplyNote worst`) fit, and the applied detail keeps 撤回 at 44 pt. Place search lists an
80-code-point place, and choosing it shows the place row with 附近 still visible and 换 at 44 pt."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from apply import count_reads, note_value, send, title_shown  # noqa: E402
from board import cards, in_view, ink_box, scroll_down, screen, visible  # noqa: E402
from bounty import relaunch, search_places  # noqa: E402
from driver import UI, assert_touch_target, by_id, reach_home, token  # noqa: E402
from ocr import find, lines  # noqa: E402

DEPS = ['src/features/bounty/', 'src/features/home/', 'src/app/(tabs)/', 'src/app/bounty-apply/',
        'verification/ui/bounty.py', 'verification/ui/board.py', 'verification/ui/apply.py', 'verification/ui/ocr.py',
        'verification/ui/ocr.swift']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 480


def code_points(seed, count):
    return ''.join(list(seed * (count // len(seed) + 1))[:count])


ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyBoard', 'worst',
        '-uiVerifyFixture', 'worst', '-uiVerifyApplyNote', 'worst']
NOTE_MAX = 140
COUNT = 45
FARTHER = 42
PILL_MIN = 43.5
GUTTER = 16
WORST_PLACE = code_points('Sunway Pyramid Convention Centre 旁边的 Sunway Lagoon 正门售票处，', 80)
CARD_ID = re.compile(r'bounty-card-fixture-worst-(\d+)')
MIDDLE = 'bounty-card-fixture-worst-25'

ui = UI(*sys.argv[1:])


def card_shot(identifier, name):
    card = visible(ui, identifier)
    ui.at_rest()
    return card, ui.snap(name)


READ = {}
PILL_LANE = 130


def assert_in_card(shot, card, pattern, what):
    if shot.path not in READ:
        READ[shot.path] = lines(shot)
    read = READ[shot.path]
    found = find(read, pattern, card['frame'])
    assert found, f'{what} ({pattern}) is not shown in full inside {card["AXUniqueId"]}: {[l["text"] for l in read]}'
    return found[0]


def pill_box(shot, card):
    f = card['frame']
    lane = {'x': f['x'] + f['width'] - PILL_LANE, 'y': f['y'] + f['height'] / 2,
            'width': PILL_LANE, 'height': f['height'] / 2}
    pill = ink_box(shot, lane, token('--color-accent', ui.appearance))
    assert pill is None or pill['x'] > lane['x'] + 1, f'accent ink reaches the left edge of the 申请 lane: {pill}'
    return pill


def padded(element, pad):
    g = element['frame']
    return {**element, 'frame': {'x': g['x'] - pad, 'y': g['y'] - pad, 'width': g['width'] + 2 * pad,
                                 'height': g['height'] + 2 * pad}}


def union(boxes):
    x0, y0 = min(b['x'] for b in boxes), min(b['y'] for b in boxes)
    x1 = max(b['x'] + b['width'] for b in boxes)
    y1 = max(b['y'] + b['height'] for b in boxes)
    return {'x': x0, 'y': y0, 'width': x1 - x0, 'height': y1 - y0}


def tail(key):
    return re.escape(ui.t(key).split('·')[-1].strip())


reach_home(ui)
more = visible(ui, 'bounty-axis-more')
assert more.get('AXLabel') == ui.t('bounty.board.axis.moreLabel', count=FARTHER), more.get('AXLabel')
ui.at_rest()
shot = ui.snap('00-axis')
width = screen(ui.read())['width']
assert more['frame']['x'] + more['frame']['width'] <= width - GUTTER + 1, f'「+N 更远」 runs past the gutter: {more["frame"]}'
more_text = re.escape(ui.t('bounty.board.axis.more', count=FARTHER)).replace('\\ ', r'\s?')
assert_in_card(shot, padded(more, 4), more_text, '「+N 更远」')

first, shot = card_shot('bounty-card-fixture-worst-01', '01-top')
f = first['frame']
assert f['x'] + f['width'] <= width - GUTTER + 1, f'the worst card overflows: {f}'
reward = assert_in_card(shot, first, r'RM\s?500', 'RM 500')
title_lines = [assert_in_card(shot, first, '帮我从', 'the first title line'),
               assert_in_card(shot, first, '搬三', 'the second title line')]
title = union(title_lines)
assert title_lines[1]['y'] >= title_lines[0]['y'] + title_lines[0]['height'] - 2, \
    f'the title did not wrap to a second line: {title_lines}'
assert title['x'] + title['width'] <= reward['x'] + 1, f'the title runs under RM 500: {title} / {reward}'
assert_in_card(shot, first, r'100\s?m', 'the distance 100 m')
pill = pill_box(shot, first)
assert pill and pill['height'] >= PILL_MIN and pill['width'] >= PILL_MIN, f'申请 is not a 44 pt pill: {pill}'
assert pill['x'] + pill['width'] <= f['x'] + f['width'], f'申请 runs past the card: {pill} / {f}'
print(f'top card: RM 500 at x {reward["x"]:.1f}, title ends {title["x"] + title["width"]:.1f}, '
      f'申请 {pill["width"]:.1f} x {pill["height"]:.1f} pt')

applied, shot = card_shot('bounty-card-fixture-worst-02', '02-applied')
assert_in_card(shot, applied, r'1[.,]8\s?km', 'the distance 1.8 km')
status = assert_in_card(shot, applied, tail('bounty.board.applied'), 'the applied line')
assert not re.search(r'…|\.\.\.$', status['text']), f'the applied line is truncated: {status["text"]!r}'

loaded = set()


def collect(items):
    loaded.update(c['AXUniqueId'] for c in cards(items) if CARD_ID.fullmatch(c['AXUniqueId']))


def scroll_until(done, message):
    for _ in range(60):
        items = ui.read()
        collect(items)
        if done(items):
            return
        scroll_down(ui, items, 0.45)
    raise AssertionError(message)


scroll_until(lambda items: by_id(items, MIDDLE), f'{MIDDLE} never loaded')
middle, shot = card_shot(MIDDLE, '03-middle')
assert_in_card(shot, middle, r'\d+(?:[.,]\d)?\s?km', 'a distance in kilometres')
assert pill_box(shot, middle), 'the middle card shows no 申请'

scroll_until(lambda items: len(loaded) == COUNT and by_id(items, 'bounty-board-end')
             and in_view(by_id(items, 'bounty-board-end'), screen(items)),
             f'the board never reached its end with {COUNT} cards: {len(loaded)} loaded')
end = ui.element('bounty-board-end')
assert end.get('AXLabel') == ui.t('bounty.board.state.end'), end.get('AXLabel')
far, shot = card_shot('bounty-card-fixture-worst-03', '04-far')
assert_in_card(shot, far, r'\b18\s?km', 'the distance 18 km')
unlocated, shot = card_shot('bounty-card-fixture-worst-04', '05-end')
assert_in_card(shot, unlocated, re.escape(ui.t('bounty.board.card.noPlace')).replace('\\ ', r'\s?'), '没写地点')

relaunch(ui, drop=[], add=[])
first = visible(ui, 'bounty-card-fixture-worst-01')
ui.at_rest()
f = first['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
ui.element('bounty-detail-title')
ui.wait(lambda items: (by_id(items, 'bounty-detail-apply') or {}).get('enabled'), '申请 in the detail never became ready')
ui.at_rest()
shot = ui.snap('06-detail')
items = ui.read()
for identifier in ('bounty-detail-title', 'bounty-detail-reward', 'bounty-detail-place'):
    found = by_id(items, identifier)
    assert found, f'{identifier} is missing'
    g = found['frame']
    assert g['x'] >= 0 and g['x'] + g['width'] <= width, f'{identifier} runs off screen: {g}'
reward = by_id(items, 'bounty-detail-reward')
assert_in_card(shot, padded(reward, 12), r'RM\s?500', 'RM 500 in the detail')
title = by_id(items, 'bounty-detail-title')
assert title['frame']['y'] + title['frame']['height'] <= reward['frame']['y'] + 1, 'the detail title overlaps RM 500'
assert_touch_target(by_id(items, 'bounty-detail-apply'), '申请 in the detail')

ui.tap('bounty-detail-apply')
title_shown(ui, 'bounty.apply.title')
note_text = ui.wait(lambda items: (lambda v: v if len(v) == NOTE_MAX and ' ' in v else None)(note_value(items)),
                    'the 140-code-point note with spaces is not in the sheet')
count_reads(ui, NOTE_MAX)
items = ui.read()
field, counter = by_id(items, 'bounty-apply-note'), by_id(items, 'bounty-apply-count')
assert counter['frame']['y'] >= field['frame']['y'] + field['frame']['height'] - 1, \
    f'the counter overlaps the note field: {field["frame"]} / {counter["frame"]}'
assert counter['frame']['y'] + counter['frame']['height'] <= screen(items)['height'], f'the counter is off screen: {counter}'
ui.at_rest()
ui.capture('07-apply-note')
send(ui)
ui.gone('bounty-apply', timeout=40)
note = ui.settled(lambda items: by_id(items, 'bounty-detail-note'), 'the applied detail shows no note')
assert note_text[:20] in (note.get('AXLabel') or ''), note.get('AXLabel')
withdraw = ui.element('bounty-detail-withdraw')
assert_touch_target(withdraw, '撤回')
assert withdraw['frame']['y'] >= note['frame']['y'] + note['frame']['height'] - 1, '撤回 overlaps the note'
ui.at_rest()
ui.capture('08-detail-applied')

relaunch(ui, drop=[], add=['-uiVerifyLocation', 'denied', '-uiVerifyBoardPlace', 'none'])
reach_home(ui)
visible(ui, 'bounty-place-row')
ui.tap('bounty-place-row')
ui.element('place-search')
search_places(ui, 'sunway', focused=True)
result = ui.wait_label('place-search-result-0', lambda label: WORST_PLACE in label,
                       'the first result is not the 80-code-point place')
g = result['frame']
assert g['x'] >= 0 and g['x'] + g['width'] <= width, f'the long result runs off screen: {g}'
ui.at_rest()
ui.capture('09-place-search')
ui.tap('place-search-result-0')
ui.gone('place-search')
near = ui.t('bounty.board.place.near', place=WORST_PLACE)
row = ui.wait_label('bounty-place-row', lambda label: near in label, f'the row does not read {near!r}')
change = ui.element('bounty-place-change')
assert_touch_target(change, '换')
r, c = row['frame'], change['frame']
assert r['x'] + r['width'] <= c['x'] + 1, f'the place text runs under 换: {r} / {c}'
assert c['x'] + c['width'] <= width - GUTTER + 1, f'换 runs past the gutter: {c}'
row = visible(ui, 'bounty-place-row')
ui.at_rest()
near_word = re.escape(ui.t('bounty.board.place.near', place='').strip())
assert_in_card(ui.snap('10-place-row'), padded(row, 4), near_word, 'the near word beside the long place')
print(f'PASS: {COUNT} worst cards, RM 500 beside a two-line title, distances shown, 44 pt 申请, +{FARTHER} 更远 from the first page, '
      'detail, 140-code-point note, long place search and row')
