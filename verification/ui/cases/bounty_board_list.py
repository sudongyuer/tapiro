"""Board cards (26A) under home: the first card is one VoiceOver element reading 帮取快递, RM 8, 急 with its deadline, Sunway Geo 宿舍 · 300 m and 小林 · 靠谱; 急 is drawn in the urgent colour with the clock symbol and 申请 is a 44 pt accent pill; the applied row has no 申请, says 已申请 and carries the green stamp; in the board scene 申请 calls apply and the rest of the card calls open; the `long` board pages to 45 unique cards with 没写地点的 once, before the first card without a place, and ends with 就这些了."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import apply_pill, cards, in_view, ink_box, scroll_down, screen, visible  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, reach_home, token  # noqa: E402

DEPS = ['src/features/bounty/', 'src/features/home/', 'src/app/(tabs)/', 'verification/ui/bounty.py',
        'verification/ui/board.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 420
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']
FIRST = 'bounty-card-fixture-bounty-01'
PLAIN = 'bounty-card-fixture-bounty-02'
APPLIED = 'bounty-card-fixture-bounty-03'
LONG_COUNT, LONG_LOCATED = 45, 40
LONG_TITLE = re.compile(r'长列表悬赏 (\d+)')
PILL_MIN = 43.5
URGENT_MIN = 20
STAMP_MIN = 40

ui = UI(*sys.argv[1:])
sep = re.escape(ui.t('bounty.board.card.separator'))


def card_label(category, title, reward, when, place, name, tier, urgent=False, applied=False):
    parts = [
        ui.pattern('bounty.board.card.label', category=re.escape(ui.t(f'bounty.category.{category}')),
                   title=re.escape(title), reward=reward),
        re.escape(ui.t('bounty.board.card.urgent')) if urgent else None,
        when,
        place,
        ui.pattern('bounty.board.card.poster', name=re.escape(name), tier=re.escape(ui.t(f'bounty.tier.{tier}'))),
        re.escape(ui.t('bounty.board.card.applied')) if applied else None,
    ]
    return re.compile(sep.join(p for p in parts if p))


def assert_label(card, pattern, name):
    label = card.get('AXLabel') or ''
    assert pattern.fullmatch(label), f'{name} reads {label!r}, expected {pattern.pattern!r}'


def column(f, left, width):
    return {'x': f['x'] + left, 'y': f['y'], 'width': width, 'height': f['height']}


reach_home(ui)
first = visible(ui, FIRST)
deadline = ui.pattern('bounty.post.confirm.deadlineAt', when=r'.+? \d{2}:\d{2}')
assert_label(first, card_label('pickup', '帮取快递', r'RM\s?8', deadline,
                               ui.pattern('bounty.board.card.place', place=re.escape('Sunway Geo 宿舍'),
                                          distance=re.escape('300 m')),
                               '小林', 'reliable', urgent=True), 'first card')
assert first.get('type') == 'Button', f'the card is not one button element: {first.get("type")}'
for part in ('-title', '-reward', '-apply', '-meta'):
    assert by_id(ui.read(), FIRST + part) is None, f'{FIRST + part} is a separate VoiceOver element'

shot = ui.snap('01-top')
f = first['frame']
urgent = token('--color-urgent', ui.appearance)
clock = ink_box(shot, column(f, 14, 18), urgent, 40)
assert clock and clock['count'] >= URGENT_MIN, f'no urgent clock symbol at the start of the time line: {clock}'
words = ink_box(shot, column(f, 34, f['width'] / 2), urgent, 40)
assert words and words['count'] >= URGENT_MIN, f'急 and the deadline are not in the urgent colour: {words}'
pill = apply_pill(shot, first, ui.appearance)
assert pill and pill['height'] >= PILL_MIN and pill['width'] >= PILL_MIN, f'申请 is not a 44 pt accent pill: {pill}'
print(f'first card: clock {clock["count"]} px, 申请 {pill["width"]:.1f} x {pill["height"]:.1f} pt')

plain = visible(ui, PLAIN)
shot = ui.snap('02-plain')
none = ink_box(shot, column(plain['frame'], 14, plain['frame']['width'] - 28), urgent, 40)
assert none is None or none['count'] < URGENT_MIN, f'a card that is not urgent shows the urgent colour: {none}'

applied = visible(ui, APPLIED)
assert_label(applied, card_label('accompany', '陪我去银行开户', r'RM\s?15', r'.+?',
                                 ui.pattern('bounty.board.card.place', place=re.escape('Maybank Bandar Sunway'),
                                            distance=re.escape('800 m')),
                                 '阿杰', 'very_reliable', applied=True), 'applied card')
shot = ui.snap('03-applied')
af = applied['frame']
stamp = ink_box(shot, column(af, 0, 90), token('--color-success', ui.appearance), 40)
assert stamp and stamp['count'] >= STAMP_MIN, f'the applied card has no 已申请 stamp: {stamp}'
no_pill = apply_pill(shot, applied, ui.appearance)
assert no_pill is None or no_pill['height'] < 20, f'the applied card still shows 申请: {no_pill}'

relaunch(ui, drop=[], add=['-uiVerifyScene', 'bounty-board'], ready='bounty-board-scene')
first = ui.element(FIRST)
pill = apply_pill(ui.snap('04-scene'), first, ui.appearance)
assert pill, 'no 申请 pill in the board scene'
ui.tap_point(pill['x'] + pill['width'] / 2, pill['y'] + pill['height'] / 2)
ui.element('bounty-post-scene-apply-fixture-bounty-01')
f = first['frame']
ui.tap_point(f['x'] + f['width'] / 2, f['y'] + 30)
ui.element('bounty-post-scene-open-fixture-bounty-01')

relaunch(ui, drop=[], add=['-uiVerifyBoard', 'long'])
seen, header_reads, header_shot = {}, 0, False
for _ in range(60):
    items = ui.read()
    ids = [c['AXUniqueId'] for c in cards(items)]
    assert len(ids) == len(set(ids)), f'a card is on screen twice: {ids}'
    for card in cards(items):
        found = LONG_TITLE.search(card.get('AXLabel') or '')
        assert found, f'{card["AXUniqueId"]} reads {card.get("AXLabel")!r}'
        seen[card['AXUniqueId']] = found.group(0)
    headers = [i for i in items if i.get('AXUniqueId') == 'bounty-board-unlocated']
    assert len(headers) <= 1, f'没写地点的 appears {len(headers)} times'
    if headers:
        header_reads += 1
        assert headers[0].get('AXLabel') == ui.t('bounty.board.unlocated'), headers[0].get('AXLabel')
        y = headers[0]['frame']['y']
        last_located = by_id(items, f'bounty-card-fixture-long-{LONG_LOCATED:02d}')
        first_unlocated = by_id(items, f'bounty-card-fixture-long-{LONG_LOCATED + 1:02d}')
        assert not last_located or last_located['frame']['y'] < y, '没写地点的 sits above a card with a place'
        assert not first_unlocated or y < first_unlocated['frame']['y'], '没写地点的 sits below the first card without one'
        if not header_shot and in_view(headers[0], screen(items)):
            header_shot = True
            ui.at_rest()
            ui.capture('05-long-unlocated')
    end = by_id(items, 'bounty-board-end')
    if end and len(seen) == LONG_COUNT and end['frame']['y'] + end['frame']['height'] <= screen(items)['height']:
        break
    scroll_down(ui, items, 0.45)
assert len(seen) == LONG_COUNT, f'{len(seen)} cards loaded, expected {LONG_COUNT}'
assert len(set(seen.values())) == LONG_COUNT, 'two cards share a title'
assert header_reads, '没写地点的 never appeared'
end = ui.element('bounty-board-end')
assert end.get('AXLabel') == ui.t('bounty.board.state.end'), end.get('AXLabel')
ui.at_rest()
ui.capture('06-long-end')
relaunch(ui, drop=[], add=['-uiVerifyBoard', 'worst'])
worst = visible(ui, 'bounty-card-fixture-worst-01')
assert worst['frame']['x'] + worst['frame']['width'] <= screen(ui.read())['width'], 'a worst-case card overflows'
ui.capture('07-worst')
visible(ui, 'bounty-card-fixture-worst-02')
ui.capture('08-worst-applied')
print(f'PASS: first card copy, urgent colour and clock, 44 pt 申请, stamp, open/apply taps, {len(seen)} unique long cards')
