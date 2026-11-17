import re

import ocr
from driver import by_id, close, token

ROW_EDGE = 36


def hairlines(items):
    form = by_id(items, 'bounty-post-form')['frame']
    return [i['frame'] for i in items if i.get('type') == 'Group' and abs(i['frame']['height'] - 1) < 0.3
            and form['x'] < i['frame']['x'] < form['x'] + form['width'] / 2
            and form['y'] < i['frame']['y'] < form['y'] + form['height']]


# Every custom row starts where the system rows do, and a hairline starts at the row edge unless its row leads
# with the 「＋」 symbol, where the system insets it to the label.
def assert_row_edges(ui, items, fields, least=1):
    form = by_id(items, 'bounty-post-form')['frame']
    for identifier in fields:
        f = by_id(items, identifier)['frame']
        assert abs(f['x'] - form['x'] - ROW_EDGE) <= 1, f'{identifier} starts at {f["x"]}, not at the row edge {ROW_EDGE}'
    adds = [i['frame'] for i in items if str(i.get('AXUniqueId')).startswith('bounty-post-add-')]
    lines = [line for line in hairlines(items)
             if not any(abs(row['y'] + row['height'] - line['y']) <= 6 for row in adds)]
    assert len(lines) >= least, f'only {len(lines)} hairlines to check, expected at least {least}'
    for line in lines:
        assert abs(line['x'] - form['x'] - ROW_EDGE) <= 1, f'a hairline starts at {line["x"]}, not at the row edge: {line}'
        assert abs(line['x'] + line['width'] - (form['x'] + form['width'] - ROW_EDGE)) <= 1, \
            f'a hairline does not end at the row edge: {line}'


def assert_chip_room(items, chips, least, name):
    frames = [by_id(items, chip)['frame'] for chip in chips]
    heights = {round(f['height']) for f in frames}
    assert len(heights) == 1, f'{name} are not one height: {frames}'
    top, low = min(f['y'] for f in frames), max(f['y'] + f['height'] for f in frames)
    for line in hairlines(items):
        gap = top - line['y'] - 1 if line['y'] < top else line['y'] - low
        assert gap >= least - 2 or gap > 60, f'{name} sit {gap:.1f} pt from a hairline: {line}'


def assert_reward_card(ui, items, suggested, amounts):
    pay = ui.t('bounty.post.form.rewardFooter')
    footer = by_id(items, 'bounty-post-reward-footer')
    assert (footer.get('AXLabel') or '') == pay, f'the reward footer reads {footer.get("AXLabel")!r}, not {pay!r}'
    chips = [by_id(items, f'bounty-post-amount-{amount}')['frame'] for amount in amounts]
    low = max(f['y'] + f['height'] for f in chips)
    assert footer['frame']['y'] - low >= 14, f'the amounts sit {footer["frame"]["y"] - low:.1f} pt above the card bottom'
    line = by_id(items, 'bounty-post-reward-suggest')
    if not suggested:
        assert line is None, f'a suggestion shows: {line}'
        return
    expected = ui.t('bounty.post.form.rewardSuggest', range=suggested)
    assert line and line.get('AXLabel') == expected, f'the suggestion in the card reads {line!r}, not {expected!r}'
    field, f = by_id(items, 'bounty-post-reward')['frame'], line['frame']
    assert field['y'] + field['height'] - 4 <= f['y'] and f['y'] + f['height'] <= min(c['y'] for c in chips) + 1, \
        f'the suggestion {f} is not between the amount {field} and the amount buttons'
    assert abs(f['x'] + f['width'] - (field['x'] + field['width'])) <= 1, f'the suggestion {f} does not end under the amount'


SWAP_BADGE = 22


def assert_swap_badge(ui, shot, art):
    f = art['frame']
    assert f['width'] >= 56 and f['height'] >= 56, f'the live card art is {f}, smaller than the 56 pt drawing'
    accent = token('--color-accent', ui.appearance)
    corner = {'x': f['x'] + f['width'] - SWAP_BADGE, 'y': f['y'] + f['height'] - SWAP_BADGE,
              'width': SWAP_BADGE, 'height': SWAP_BADGE}
    filled = shot.count(corner, lambda rgb: close(rgb, accent, 10))
    total = sum(1 for _ in shot.pixels(corner))
    print(f'swap badge: {filled} of {total} pixels in the accent')
    assert filled >= total * 0.45, f'no swap badge on the art corner: {filled} of {total} accent pixels in {corner}'


def squash(text):
    return re.sub(r'[\s·]', '', text).replace('–', '-').replace('—', '-').replace('：', ':')


# The accessibility label holds the whole text even when the drawn line ends in 「…」, so the pixels are read.
def assert_time_whole(ui, shot, card):
    items = ui.read()
    time, text = by_id(items, f'{card}-time'), by_id(items, f'{card}-text')
    assert time and text, f'{card} shows no time line'
    expected = squash(time.get('AXLabel') or '')
    assert len(expected) >= 4, f'{card} time reads {time.get("AXLabel")!r}'
    f = text['frame']
    region = {'x': f['x'] - 4, 'y': f['y'] - 4, 'width': f['width'] + 8, 'height': f['height'] + 8}
    drawn = squash(''.join(line['text'] for line in sorted(ocr.lines_in(shot, ui.locale), key=lambda l: (l['y'], l['x']))
                           if ocr.inside(line, region, slack=6)))
    print(f'{card}: time {expected!r}, drawn {drawn!r}')
    assert expected in drawn, f'{card} does not draw the whole time {expected!r}: {drawn!r}'


# A hard scroll edge draws the bar as a lighter band with a line under it; in the gutter beside the cards a soft
# edge changes gradually or not at all.
def assert_soft_header(shot, items):
    form, card = by_id(items, 'bounty-post-form')['frame'], by_id(items, 'bounty-post-live-text')
    assert card is None or card['frame']['y'] < form['y'] + 90, \
        f'the live card is still below the bar ({card["frame"]}), so nothing scrolled under it'
    x = form['x'] + 6
    rows = [shot.rgb(x, form['y'] + 30 + step / shot.scale) for step in range(round(64 * shot.scale))]
    steps = [max(abs(a - b) for a, b in zip(above, below)) for above, below in zip(rows, rows[1:])]
    print(f'header edge: largest step between pixel rows {max(steps)}')
    assert max(steps) <= 3, f'the bar ends in a hard edge over scrolled content (a step of {max(steps)})'
