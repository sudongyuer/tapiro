"""Shared walk for the worst-case home cases: accessory and badge on 拼车, then home stacked, fanned and scrolled."""
from driver import accessory, by_id, reach_home

FRONT = {'worst': '付给Wan Nurul Aisyah', 'one': '付给Jo'}


def walk_home(ui, variant, steps=14):
    ui.element('sign-in-apple')
    reach_home(ui)
    ui.settled(lambda items: by_id(items, 'live-card-oweMoney') and by_id(items, 'home-stage-urgent'),
               'home never settled')
    ui.snap('01-stacked')

    ui.tap('tab-ride')
    items = ui.wait(lambda items: accessory(items) and items, 'accessory missing on 拼车')
    label = accessory(items).get('AXLabel') or ''
    assert label.startswith(FRONT[variant]), f'accessory label {label}'
    ui.snap('02-accessory-expanded')

    ui.tap('tab-bounty')
    ui.tap('live-cards-toggle')
    ui.settled(lambda items: by_id(items, 'live-card-bountyInProgress'), 'cards did not fan out')
    ui.snap('03-fanned')
    previous = None
    for step in range(steps):
        ui.swipe((200, 650), (200, 350), duration=1)
        items = ui.read()
        ui.snap(f'04-scroll-{step:02d}')
        cards = by_id(items, 'home-live-cards')['frame']
        if by_id(items, 'urgent-accessory-inline') or cards == previous:
            break
        previous = cards
    else:
        raise AssertionError('scrolling never reached the inline accessory or the end of home')
    print('PASS: worst-case home walk captured')
