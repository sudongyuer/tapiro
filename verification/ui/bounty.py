import subprocess

from driver import BUNDLE_ID, assert_touch_target, by_id, reach_home
from run import REGIONS

OPEN = 'bounty.post.open'
TITLE = 'bounty.post.title'
NEXT = 'bounty.post.next'
CANCEL = 'bounty.post.cancel'
CONFIRM_TITLE = 'bounty.post.confirm.title'
CATEGORIES = ['pickup', 'buy', 'queue', 'handle', 'move', 'accompany', 'study', 'other']
EMPTY_DRAFT = ['-uiVerifyBountyDraft', 'none']
REWARD_RANGE = {'min': 1, 'max': 500}
GROUPED_BACKGROUND = {'light': [(242, 242, 247)], 'dark': [(0, 0, 0), (28, 28, 30)]}


def open_post(ui):
    reach_home(ui)
    ui.tap_label(ui.t(OPEN))
    return ui.element('bounty-post-form')


def placeholders(ui):
    return {
        'bounty-post-title': ui.t('bounty.post.form.titlePlaceholder'),
        'bounty-post-reward': ui.t('bounty.post.form.rewardPlaceholder', **REWARD_RANGE),
    }


def field_text(ui, items, identifier):
    shown = (by_id(items, identifier) or {}).get('AXValue') or ''
    return '' if shown == placeholders(ui).get(identifier) else shown


def value(ui, identifier):
    return field_text(ui, ui.read(), identifier)


FIELD_BAND = 9


def typed(ui, identifier, text, shows=None, band=True):
    f = ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled')['frame']
    ui.tap_point(f['x'] + f['width'] - 4, f['y'] - FIELD_BAND if band else f['y'] + f['height'] / 2)
    ui.type(text)
    shows = shows or text
    ui.wait(lambda items: (by_id(items, identifier) or {}).get('AXValue') == shows, f'{identifier} does not read {shows!r}')


def erase(ui, identifier):
    f = ui.element(identifier)['frame']
    ui.tap_point(f['x'] + f['width'] - 2, f['y'] + f['height'] + FIELD_BAND)
    ui.backspace(len(value(ui, identifier)) + 1)
    ui.wait(lambda items: by_id(items, identifier) and not field_text(ui, items, identifier), f'{identifier} is not empty')


def pick_category(ui, slug):
    picker = ui.element('bounty-post-category')['frame']
    ui.tap_point(picker['x'] + picker['width'] - 60, picker['y'] + picker['height'] / 2)
    ui.tap_label(ui.t(f'bounty.category.{slug}'))
    ui.wait(lambda items: not any(i.get('AXLabel') == ui.t('bounty.post.form.categoryPlaceholder') for i in items),
            'category placeholder still shown')


TITLE_TYPED, TITLE_SHOWN = 'parcel', 'Parcel'


def fill_fixed(ui, slug='pickup', reward='8'):
    typed(ui, 'bounty-post-title', TITLE_TYPED, TITLE_SHOWN)
    pick_category(ui, slug)
    typed(ui, 'bounty-post-reward', reward)


def next_step(ui):
    ui.tap_label(ui.t(NEXT))


def assert_error(ui, key, **values):
    expected = ui.t(key, **values)
    return ui.wait_label('bounty-post-error', lambda label: expected in label, f'error {expected!r} not shown')


def assert_title(ui, key):
    label = ui.t(key)
    return ui.wait(lambda items: next((i for i in items if i.get('type') == 'Heading' and i.get('AXLabel') == label
                                       and i['frame']['y'] < 140), None), f'{label} is not the sheet title')


def reach_confirm(ui):
    next_step(ui)
    ui.gone('bounty-post-form')
    return assert_title(ui, CONFIRM_TITLE)


def close_sheet_by_swipe(ui):
    form = ui.element('bounty-post-form')['frame']
    x = form['x'] + form['width'] / 2
    ui.swipe((x, form['y'] + 12), (x, form['y'] + form['height'] * 0.9), 0.3)
    ui.gone('bounty-post-form')


def relaunch(ui, drop=EMPTY_DRAFT, add=(), ready='home-scroll'):
    args = list(ui.launch_args)
    for start in range(len(args) - len(drop) + 1):
        if args[start:start + len(drop)] == drop:
            args = args[:start] + args[start + len(drop):]
            break
    subprocess.run(['xcrun', 'simctl', 'terminate', ui.udid, BUNDLE_ID], capture_output=True)
    subprocess.run(['xcrun', 'simctl', 'launch', ui.udid, BUNDLE_ID, '-AppleLanguages', f'({ui.locale})',
                    '-AppleLocale', REGIONS[ui.locale], *args, *add], check=True, capture_output=True, timeout=60)
    ui.element(ready, timeout=60)


def assert_grouped_background(ui, shot, f, name):
    found = shot.rgb(f['x'] + 6, f['y'] + f['height'] / 2)
    expected = GROUPED_BACKGROUND[ui.appearance]
    assert any(max(abs(a - b) for a, b in zip(found, colour)) <= 6 for colour in expected), \
        f'{name} background is {found}, expected one of {expected} ({ui.appearance})'


def tap_sheet_action(ui, label, besides):
    action = ui.settled(lambda items: next((i for i in items if i.get('AXLabel') == label
                                            and i.get('AXUniqueId') != besides and i.get('type') == 'Button'), None),
                        f'action sheet button {label} never settled')['frame']
    ui.tap_point(action['x'] + action['width'] / 2, action['y'] + action['height'] / 2)


DEMO_TITLE = '帮我取个快递'


def open_confirm(ui, hint=False):
    open_post(ui)
    if hint:
        dismiss_hint(ui)
    ui.wait(lambda items: field_text(ui, items, 'bounty-post-title') == DEMO_TITLE, 'the demo draft is not in the form')
    next_step(ui)
    return ui.element('bounty-post-confirm')


def cost_label(ui):
    return (ui.element('bounty-post-cost') or {}).get('AXLabel') or ''


def assert_cost(ui, expected):
    return ui.wait_label('bounty-post-cost', lambda label: expected in label, f'cost row does not read {expected!r}')


def assert_pinned(ui, identifier, name):
    items = ui.read()
    button, sheet = by_id(items, identifier), by_id(items, 'bounty-post-confirm')
    assert button and sheet, f'{name} or the confirm sheet is missing'
    assert_touch_target(button, name)
    f, form = button['frame'], sheet['frame']
    assert f['y'] >= form['y'] + form['height'] - 1, f'{name} is inside the form, not pinned below it: {f}'
    return button


def publish_and_close(ui):
    ui.tap('bounty-post-publish')
    ui.gone('bounty-post-confirm', timeout=30)
    ui.element('home-scroll')


def dismiss_hint(ui):
    ui.labelled(ui.t('bounty.post.hint.title'))
    ui.tap_label(ui.t('bounty.post.hint.later'))
    ui.wait(lambda items: not any(i.get('AXLabel') == ui.t('bounty.post.hint.later') for i in items), 'the hint stayed')
