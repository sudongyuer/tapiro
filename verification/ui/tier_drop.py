import re
import time

from board import screen
from driver import assert_touch_target, by_id
from profile import rep_calls

KEY = 'reputation.tierDrop'
SHEET = 'tier-drop-sheet'


def plural(ui, key, count, **values):
    return ui.tn(f'{KEY}.{key}', count, **values)


def tier(ui, name):
    return ui.t(f'bounty.tier.{name}')


def way_back(ui, tier_name, settled=0, people=0, reviews=0):
    steps = [step for step in (
        settled and ui.t(f'{KEY}.stepSettled', count=settled),
        people and plural(ui, 'stepPeople', people),
        reviews and plural(ui, 'stepReviews', reviews),
    ) if step]
    joined = steps[0] if len(steps) == 1 else \
        ui.t(f'{KEY}.stepJoin').join(steps[:-1]) + ui.t(f'{KEY}.stepLast') + steps[-1]
    text = ui.t(f'{KEY}.wayBack', steps=joined, tier=tier(ui, tier_name))
    return text[:1].upper() + text[1:]


def no_show_pattern(ui, count, titles):
    item = '|'.join(ui.pattern(f'{KEY}.noShowItem', date=r'[^·;；（）()]+?', title=re.escape(title)) for title in titles)
    items = f'(?:{item})(?:{re.escape(ui.t(f"{KEY}.itemJoin"))}(?:{item}))*'
    key = f'{KEY}.noShows_one' if count == 1 and ui.locale == 'en' else f'{KEY}.noShows_other'
    return '^' + ui.pattern(key, count=str(count), items=items) + '$'


def label(ui, identifier):
    return ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled').get('AXLabel') or ''


def open_sheet(ui, timeout=45):
    ui.element(SHEET, timeout=timeout)
    ui.at_rest()
    return ui.read()


def assert_sheet(ui, title_tier, reasons, wayback):
    items = ui.read()
    assert label(ui, 'tier-drop-title') == ui.t(f'{KEY}.title', tier=tier(ui, title_tier)), label(ui, 'tier-drop-title')
    for index, expected in enumerate(reasons):
        text = label(ui, f'tier-drop-reason-{index}')
        assert re.search(expected, text) if expected.startswith('^') else text == expected, \
            f'reason {index} reads {text!r}, expected {expected!r}'
    assert by_id(items, f'tier-drop-reason-{len(reasons)}') is None, 'the sheet shows a reason the drop does not have'
    assert label(ui, 'tier-drop-way-back') == wayback, f'{label(ui, "tier-drop-way-back")!r} != {wayback!r}'
    got_it = by_id(items, 'tier-drop-got-it')
    profile = by_id(items, 'tier-drop-profile')
    assert got_it and got_it.get('AXLabel') == ui.t(f'{KEY}.gotIt'), got_it
    assert profile and profile.get('AXLabel') == ui.t(f'{KEY}.profile'), profile
    assert_touch_target(got_it, ui.t(f'{KEY}.gotIt'))
    assert_touch_target(profile, ui.t(f'{KEY}.profile'))
    height = screen(items)['height']
    reason_ids = [f'tier-drop-reason-{index}' for index in range(len(reasons))]
    for identifier in ('tier-drop-title', *reason_ids, 'tier-drop-way-back', 'tier-drop-got-it', 'tier-drop-profile'):
        f = by_id(items, identifier)['frame']
        assert 0 < f['y'] and f['y'] + f['height'] <= height, f'{identifier} runs off the sheet: {f}'
    return items


def assert_not_shown(ui, settle=4):
    pending = rep_calls(ui, 'pendingTierDrop', 1, timeout=30)
    assert pending, 'the app never asked for a pending tier drop'
    time.sleep(settle)  # the sheet is pushed as soon as the answer lands
    assert by_id(ui.read(), SHEET) is None, 'the tier-drop sheet showed'


def seen_ids(ui, count=1, timeout=10):
    return [call['id'] for call in rep_calls(ui, 'markTierDropSeen', count, timeout=timeout)]


def assert_seen_once(ui, message):
    assert seen_ids(ui) == [1], message
    assert seen_ids(ui, 2, timeout=3) == [1], f'the drop was marked seen more than once: {seen_ids(ui, 2, timeout=0)}'
