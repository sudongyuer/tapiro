"""Shared walk for the worst-case home cases: accessory and badge on 拼车, then home stacked, fanned and scrolled."""
from driver import accessory, by_id, reach_home

FRONT = {'worst': '付给Wan Nurul Aisyah', 'one': '付给Jo'}
AMOUNT = {'worst': '12,345.60', 'one': '0.50'}
DESTINATION = {
    'worst': 'Pangsapuri Vista Harmoni Blok C, Jalan PJS 7/19',
    'one': 'KL',
}


def ride_stops_inside_card(items, variant):
    card = by_id(items, 'live-card-rideSoon')
    if not card:
        return False
    f = card['frame']
    assert f['x'] >= 0 and f['x'] + f['width'] <= 402, f'ride card leaves the screen: {f}'
    assert DESTINATION[variant] in (card.get('AXLabel') or ''), f'ride card label lacks the destination: {card.get("AXLabel")}'
    return True


def walk_home(ui, variant, steps=14):
    ui.element('sign-in-apple')
    reach_home(ui)
    ui.settled(lambda items: by_id(items, 'live-card-oweMoney') and by_id(items, 'home-stage-urgent'),
               'home never settled')
    stage = by_id(ui.read(), 'home-stage-urgent').get('AXLabel') or ''
    if ui.locale == 'zh-Hans':
        assert stage.endswith('送到啦，记得付款'), f'stage line {stage}'
    ui.snap('01-stacked')

    ui.tap('tab-ride')
    items = ui.wait(lambda items: accessory(items) and items, 'accessory missing on 拼车')
    label = accessory(items).get('AXLabel') or ''
    assert label.startswith(FRONT[variant]), f'accessory label {label}'
    assert AMOUNT[variant] in label, f'accessory label lacks the amount {AMOUNT[variant]}: {label}'
    assert '3' in label, f'accessory label lacks the more count: {label}'
    ui.snap('02-accessory-expanded')

    ui.tap('tab-bounty')
    ui.tap('live-cards-toggle')
    ui.settled(lambda items: by_id(items, 'live-card-bountyInProgress'), 'cards did not fan out')
    ui.snap('03-fanned')
    stops_checked = ride_stops_inside_card(ui.read(), variant)
    previous = None
    for step in range(steps):
        ui.swipe((200, 650), (200, 350), duration=1)
        items = ui.read()
        ui.snap(f'04-scroll-{step:02d}')
        stops_checked = ride_stops_inside_card(items, variant) or stops_checked
        cards = by_id(items, 'home-live-cards')['frame']
        if by_id(items, 'urgent-accessory-inline') or cards == previous:
            break
        previous = cards
    else:
        raise AssertionError('scrolling never reached the inline accessory or the end of home')
    assert stops_checked, 'the ride card was never on screen to check'
    print('PASS: worst-case home walk captured')
