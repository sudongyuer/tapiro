import json
import re
import subprocess
import time
from pathlib import Path

from driver import BUNDLE_ID, assert_touch_target, bottom, by_id, close, dominant, reach_home
from gestures import drag
from records import reset_records
from run import REGIONS
from swifttool import SIMULATOR, compiled

OPEN = 'bounty.post.open'
TITLE = 'bounty.post.title'
NEXT = 'bounty.post.next'
CANCEL = 'bounty.post.cancel'
CONFIRM_TITLE = 'bounty.post.confirm.title'
CATEGORIES = ['pickup', 'buy', 'queue', 'handle', 'move', 'accompany', 'study', 'other']
EMPTY_DRAFT = ['-uiVerifyBountyDraft', 'none']
REWARD_RANGE = {'min': 1, 'max': 500}
REWARD_RANGE_TEXT = {'range': 'RM\u00a01–500'}
CNY_RANGE_TEXT = {'range': '¥1–800'}
GROUPED_BACKGROUND = {'light': [(242, 242, 247)], 'dark': [(0, 0, 0), (28, 28, 30)]}


KINDS = ['pickup', 'buy', 'queue', 'move', 'accompany', 'study']


def open_sheet(ui):
    reach_home(ui)
    ui.tap_label(ui.t(OPEN))
    return ui.wait(lambda items: by_id(items, 'bounty-post-pick') or by_id(items, 'bounty-post-form'),
                   'neither the tile screen nor the form opened')


def open_post(ui, tile=None):
    if (open_sheet(ui).get('AXUniqueId')) == 'bounty-post-pick':
        ui.tap(f'bounty-post-pick-{tile}' if tile else 'bounty-post-pick-free')
    return ui.element('bounty-post-form')


def placeholders(ui):
    titles = {ui.t('bounty.post.form.titlePlaceholder')} | {ui.t(f'bounty.post.kind.{kind}.title') for kind in KINDS}
    return {'bounty-post-title': titles, 'bounty-post-reward': {'0'}}


def field_text(ui, items, identifier):
    shown = (by_id(items, identifier) or {}).get('AXValue') or ''
    return '' if shown in placeholders(ui).get(identifier, ()) else shown


def value(ui, identifier):
    return field_text(ui, ui.read(), identifier)


FIELD_BAND = 9
FULL_ROW = 40


def field_point(f, below=False):
    if f['height'] >= FULL_ROW:
        return f['x'] + f['width'] - 4, f['y'] + f['height'] / 2
    return f['x'] + f['width'] - (2 if below else 4), (f['y'] + f['height'] + FIELD_BAND) if below else (f['y'] - FIELD_BAND)


def typed(ui, identifier, text, shows=None, band=True):
    f = ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled')['frame']
    ui.tap_point(*(field_point(f) if band else (f['x'] + f['width'] - 4, f['y'] + f['height'] / 2)))
    ui.type(text)
    shows = shows or text
    ui.wait(lambda items: (by_id(items, identifier) or {}).get('AXValue') == shows, f'{identifier} does not read {shows!r}')


def burst(ui, identifier, text):
    f = ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled')['frame']
    ui.tap_point(*field_point(f))
    ui.axe('type', text)
    ui.wait(lambda items: (by_id(items, identifier) or {}).get('AXValue') == text, f'{identifier} does not read {text!r}')


def erase(ui, identifier):
    f = ui.element(identifier)['frame']
    ui.tap_point(*field_point(f, below=True))
    ui.backspace(len(value(ui, identifier)) + 1)
    ui.wait(lambda items: by_id(items, identifier) and not field_text(ui, items, identifier), f'{identifier} is not empty')


def pick_category(ui, slug):
    picker = ui.element('bounty-post-category')['frame']
    ui.tap_point(picker['x'] + picker['width'] / 2, picker['y'] + picker['height'] / 2)
    ui.tap_label(ui.t(f'bounty.category.{slug}'))
    ui.wait(lambda items: not any(i.get('AXLabel') == ui.t('bounty.post.form.categoryPlaceholder') for i in items),
            'category placeholder still shown')


TITLE_TYPED, TITLE_SHOWN = 'Parcel', 'Parcel'


def fill_fixed(ui, slug='pickup', reward='8'):
    typed(ui, 'bounty-post-title', TITLE_TYPED, TITLE_SHOWN)
    pick_category(ui, slug)
    typed(ui, 'bounty-post-reward', reward)


def assert_category_one_line(ui, slug):
    name = ui.t(f'bounty.category.{slug}')

    def plain(items, label, within=None):
        return next((i for i in items if i.get('AXLabel') == label and not i.get('AXUniqueId') and (
            within is None or (within['x'] <= i['frame']['x'] < within['x'] + within['width']
                               and within['y'] - within['height'] < i['frame']['y'] < within['y'] + within['height']))), None)

    def shown(items):
        picker = (by_id(items, 'bounty-post-category') or {}).get('frame')
        return picker and plain(items, name, picker)

    value = ui.settled(shown, f'the type row does not show {name}')['frame']
    label = plain(ui.read(), ui.t('bounty.post.form.category'))
    assert label, 'the type row label is missing'
    line = label['frame']['height']
    assert value['height'] < line * 1.5, f'{name} wraps in the type row: {value} beside a {line} pt line'


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


def relaunch(ui, drop=EMPTY_DRAFT, add=(), ready='home-scroll', keep_records=False):
    args = list(ui.launch_args)
    for start in range(len(args) - len(drop) + 1):
        if args[start:start + len(drop)] == drop:
            args = args[:start] + args[start + len(drop):]
            break
    subprocess.run(['xcrun', 'simctl', 'terminate', ui.udid, BUNDLE_ID], capture_output=True)
    if not keep_records:
        reset_records(ui.udid)
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
    assert f['y'] + f['height'] <= form['y'] + form['height'] + 1, f'{name} is below the sheet: {f}, sheet {form}'
    assert f['y'] > form['y'] + form['height'] * 0.75, f'{name} is not pinned in the bottom part of the sheet: {f}'
    return button


def publish_and_close(ui):
    ui.tap('bounty-post-publish')
    ui.gone('bounty-post-confirm', timeout=30)
    ui.element('home-scroll')


def dismiss_hint(ui):
    ui.labelled(ui.t('bounty.post.hint.title'))
    ui.tap_label(ui.t('bounty.post.hint.later'))
    ui.wait(lambda items: not any(i.get('AXLabel') == ui.t('bounty.post.hint.later') for i in items), 'the hint stayed')


def assert_preview(ui, title, amount, symbol='RM'):
    reward = re.compile(rf'{re.escape(symbol)}\s?{re.escape(amount)}$')
    text = ui.wait_label('bounty-post-preview-text', lambda label: title in label, f'the preview does not show {title!r}')
    found = ui.wait_label('bounty-post-preview-reward', lambda label: bool(reward.search(label)),
                          f'the preview reward is not {symbol} {amount}')
    return text, found



PUBLISHED_KEY = 'uiVerifyPublishedArgs'


def form_scroll_to(ui, identifier, tries=6):
    for _ in range(tries):
        items = ui.read()
        found, form = by_id(items, identifier), by_id(items, 'bounty-post-form')
        f = form['frame']
        if found and found['frame']['y'] >= f['y'] + 100 and bottom(found) <= f['y'] + f['height'] - 40:
            return found
        x = f['x'] + f['width'] / 2
        ui.swipe((x, f['y'] + f['height'] * 0.75), (x, f['y'] + f['height'] * 0.4), 0.4)
    return ui.element(identifier, timeout=5)


def dismiss_keyboard(ui, container='bounty-post-form'):
    # A number pad has no Return key; the form dismisses the keyboard when it starts to scroll. A downward drag at the
    # top of the form would pull the sheet down instead, so the drag goes up.
    f = ui.element(container)['frame']
    x = f['x'] + f['width'] / 2
    drag(ui, (x, f['y'] + 300), (x, f['y'] + 220), duration=0.6, steps=30)


def end_editing(ui):
    # On iOS 27.2 an `axe key` Return leaves the field focused while typed letters land; the on-screen key ends editing.
    tap_centre(ui, ui.settled(lambda items: by_id(items, 'Return'), 'the keyboard has no Return key'))
    ui.gone('Return')


def search_field(ui):
    hint = ui.t('bounty.place.searchPlaceholder')
    return lambda items: next((i for i in items if i.get('type') in ('SearchField', 'TextField')
                               and hint in (i.get('AXValue') or '', i.get('AXPlaceholderValue') or '')), None)


def search_places(ui, text, focused=False):
    f = ui.settled(search_field(ui), 'the header search field never settled')['frame']
    if not focused:
        ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)
    ui.type(text)


PASTE = {'zh-Hans': '粘贴', 'en': 'Paste', 'ms': 'Tampal'}
SELECT_ALL = {'zh-Hans': '全选', 'en': 'Select All', 'ms': 'Pilih Semua'}


def copy_on_device(ui, text):
    # simctl pbcopy is a silent no-op on Xcode 27.2 (pbpaste reads nothing back); a UIKit tool spawned in the
    # Simulator writes the device pasteboard itself.
    binary = compiled('pasteboard', SIMULATOR)
    subprocess.run(['xcrun', 'simctl', 'spawn', ui.udid, str(binary), text], check=True, timeout=20)
    on_board = device_pasteboard(ui)
    assert on_board == text, f'the device pasteboard reads {on_board!r}, not {text!r}'


def device_pasteboard(ui):
    return subprocess.run(['xcrun', 'simctl', 'pbpaste', ui.udid], capture_output=True, check=True,
                          timeout=20).stdout.decode()


def menu_item(label):
    return lambda items: next((i for i in items if i.get('AXLabel') == label and i.get('type') == 'GenericElement'), None)


def tap_centre(ui, item):
    f = item['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)


def paste_into(ui, identifier, text):
    # Taps only: an AXe ⌘V carries no user authentication, so iOS asks for paste permission and pastes nothing, and AXe
    # key events (⌘A, typed keys) are dropped for seconds at a time on iOS 27. 粘贴 in the edit menu is the user's own
    # paste; 全选 first makes it replace what the field holds.
    # The app sometimes pastes the value an earlier case left on the pasteboard although simctl pbpaste already reads
    # the new one (bounty_post_place, 2026-11-10 and 2026-11-13), so a stale paste is written and pasted once more.
    for attempt in range(2):
        copy_on_device(ui, text)
        paste_once(ui, identifier)
        try:
            ui.wait(lambda items: (by_id(items, identifier) or {}).get('AXValue') == text,
                    f'{identifier} does not read {text!r}', 10 if attempt == 0 else 30)
            return
        except AssertionError:
            try:
                pasted = (by_id(ui.read(), identifier) or {}).get('AXValue')
            except AssertionError:
                pasted = None
            print(f'paste_into: {identifier} reads {pasted!r} after pasting {text!r} (attempt {attempt + 1})', flush=True)
            if attempt == 1:
                raise


def paste_once(ui, identifier):
    paste, select_all = PASTE[ui.locale], SELECT_ALL[ui.locale]
    tap_centre(ui, ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled'))
    f = ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled after focus')['frame']
    end = (f['x'] + f['width'] - 8, f['y'] + f['height'] / 2)
    for attempt in range(4):
        ui.tap_point(*end)
        try:
            ui.wait(menu_item(paste), f'{identifier} shows no edit menu with {paste}', 3)
            break
        except AssertionError:
            if attempt == 3:
                raise
    select = menu_item(select_all)(ui.read())
    if select:
        tap_centre(ui, select)
        ui.wait(lambda items: not menu_item(select_all)(items) and menu_item(paste)(items),
                f'{select_all} did not select the text in {identifier}', 5)
    tap_centre(ui, ui.wait(menu_item(paste), f'{identifier} lost the edit menu', 3))


def published_args(ui, timeout=20):
    container = subprocess.run(['xcrun', 'simctl', 'get_app_container', ui.udid, BUNDLE_ID, 'data'],
                               capture_output=True, text=True, check=True, timeout=20).stdout.strip()
    plist = Path(container) / 'Library' / 'Preferences' / f'{BUNDLE_ID}.plist'
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        proc = subprocess.run(['plutil', '-extract', PUBLISHED_KEY, 'raw', '-o', '-', str(plist)],
                              capture_output=True, text=True)
        if proc.returncode == 0 and proc.stdout.strip():
            return json.loads(proc.stdout)
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
    raise AssertionError(f'the fixture recorded no publish in {PUBLISHED_KEY}')


def label_strips(f, label):
    wide = sum(17.5 if ord(ch) > 0x2E80 else 10 for ch in label) + 8
    centre, inset = f['x'] + f['width'] / 2, 6
    band = {'y': f['y'] + f['height'] * 0.25, 'height': f['height'] * 0.5}
    left = {**band, 'x': f['x'] + inset, 'width': centre - wide / 2 - f['x'] - inset}
    right = {**band, 'x': centre + wide / 2, 'width': f['x'] + f['width'] - inset - centre - wide / 2}
    return [strip for strip in (left, right) if strip['width'] >= 4]


def crosses(a, b):
    return a['x'] < b['x'] + b['width'] and b['x'] < a['x'] + a['width'] and \
        a['y'] < b['y'] + b['height'] and b['y'] < a['y'] + a['height']


# A text row has no fill of its own, so the bar behind it must be one colour wherever content scrolls under it.
def assert_bar_hides_content(shot, strip, behind, name, tolerance=8):
    assert crosses(strip, behind), (
        f'nothing scrolled under {name}: {behind} does not cross {strip}, so the check would prove nothing')
    fill = dominant(shot, strip)
    total = sum(1 for _ in shot.pixels(strip))
    stray = shot.count(strip, lambda rgb: not close(rgb, fill, tolerance))
    print(f'{name}: fill {fill}, {stray} of {total} pixels differ')
    assert stray <= total * 0.01, f'{name}: scrolled content shows through ({stray} of {total} pixels)'


# Content scrolled under a pinned bar must not show through a button: beside the label the fill is one colour.
def assert_fill_hides_content(shot, element, behind, name):
    assert element, f'{name} is missing'
    f = element['frame']
    assert f['height'] < 1.6 * 44, f'{name} {f} wraps its label, so the strips beside it would hold its own ink'
    strips = label_strips(f, element.get('AXLabel') or '')
    assert strips, f'{name} {f} leaves no fill beside its label'
    for strip in strips:
        assert_bar_hides_content(shot, strip, behind, name, tolerance=24)
