import json
import time
from datetime import datetime, timedelta, timezone

from choose import defaults
from driver import by_id

SCENE = 'coins-page'
BASE_ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']


def coin_calls(ui, name, count, timeout=10, where=None):
    deadline = time.monotonic() + timeout
    while True:
        text = defaults(ui, 'uiVerifyCoinsCalls')
        found = [call['args'] for call in json.loads(text or '[]')
                 if call['name'] == name and (where is None or where(call['args']))]
        if len(found) >= count or time.monotonic() >= deadline:
            return found
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously


def month(offset=0):
    now = datetime.now(timezone.utc)
    index = now.year * 12 + now.month - 1 - offset
    return f'{index // 12:04d}-{index % 12 + 1:02d}'


def label(ui, identifier):
    return ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled').get('AXLabel') or ''


def balance_label(ui, coins, left, total=3):
    return ui.tn('coins.balanceA11y', coins) + ui.t('coins.listJoin') + ui.t('coins.freePosts', left=left, total=total)


def row_title(ui, reason, title=None):
    name = ui.t(f'coins.reason.{reason}')
    return ui.t('coins.withTitle', reason=name, title=title) if title else name


def row_prefix(ui, reason, delta, title=None):
    sign = f'+{delta}' if delta > 0 else f'−{-delta}'
    join = ui.t('coins.listJoin')
    return f'{row_title(ui, reason, title)}{join}{sign}{join}'


def row_ids(items):
    rows = [i for i in items if (i.get('AXUniqueId') or '').startswith('coins-row-')]
    return [int(i['AXUniqueId'][len('coins-row-'):]) for i in sorted(rows, key=lambda i: i['frame']['y'])]


def month_ids(items):
    heads = [i for i in items if (i.get('AXUniqueId') or '').startswith('coins-month-')]
    return [i['AXUniqueId'][len('coins-month-'):] for i in sorted(heads, key=lambda i: i['frame']['y'])]


def open_page(ui, timeout=45):
    ui.element('coins-screen', timeout=timeout)
    return ui.element('coins-balance', timeout=30)


def month_label(ui, key):
    year, number = (int(part) for part in key.split('-'))
    malaysia_year = (datetime.now(timezone.utc) + timedelta(hours=8)).year
    name = ui.t(f'coins.monthName.m{number}')
    if year == malaysia_year:
        return ui.t('coins.month', name=name)
    return ui.t('coins.monthYear', name=name, year=year)


def assert_month_labels(ui, items):
    keys = month_ids(items)
    assert keys, 'no month header on screen'
    for key in keys:
        found = by_id(items, f'coins-month-{key}').get('AXLabel') or ''
        assert found == month_label(ui, key), f'month {key} reads {found!r}, expected {month_label(ui, key)!r}'
    return keys


PACKS = (5, 11, 35)
PRICES = {5: 'RM 4.90', 11: 'RM 9.90', 35: 'RM 29.90'}


def open_sheet(ui):
    ui.tap('coins-buy')
    ui.element('buy-coins', timeout=30)
    return ui.element('buy-coins-buy-5', timeout=30)


def sheet_balance(ui, coins):
    return ui.t('coins.buy.balance', balance=f'{coins:,}' if coins >= 0 else str(coins))


def wait_status(ui, key, prefix='buy-coins', timeout=30, **values):
    expected = ui.t(key, **values)
    return ui.wait_label(f'{prefix}-status', lambda text: expected in text, f'the status never read {expected!r}',
                         timeout=timeout)


def assert_packs(ui, prefix='buy-coins'):
    items = ui.read()
    rows = [by_id(items, f'{prefix}-buy-{coins}') for coins in PACKS]
    assert all(rows), f'a pack is missing: {[coins for coins, row in zip(PACKS, rows) if not row]}'
    ys = [row['frame']['y'] for row in rows]
    assert ys == sorted(ys), f'the packs are not smallest first: {ys}'
    for coins in PACKS:
        button = by_id(items, f'{prefix}-buy-{coins}')
        assert button is not None, f'pack {coins} has no price button'
        expected = ui.t('coins.buy.packA11y', coins=coins, price=PRICES[coins])
        assert button.get('AXLabel') == expected, f'pack {coins} reads {button.get("AXLabel")!r}, not {expected!r}'
    return items


def tap_price(ui, identifier):
    # The AX frame of a bordered button in a Form row is the whole row; only the capsule on its trailing side takes a tap.
    f = ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled')['frame']
    ui.tap_point(f['x'] + f['width'] - 50, f['y'] + f['height'] / 2)
