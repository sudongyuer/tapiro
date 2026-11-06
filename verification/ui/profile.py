import json
import subprocess
import time

from choose import defaults
from driver import by_id
from swifttool import SIMULATOR, compiled

SCENE = 'profile'
SELF_ID = '00000000-0000-4000-8000-000000000001'
MEI = 'fixture-person-mei'
BASE_ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']


def rep_calls(ui, name, count, timeout=10, where=None):
    deadline = time.monotonic() + timeout
    while True:
        text = defaults(ui, 'uiVerifyRepCalls')
        found = [call['args'] for call in json.loads(text or '[]')
                 if call['name'] == name and (where is None or where(call['args']))]
        if len(found) >= count or time.monotonic() >= deadline:
            return found
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously


def label(ui, identifier):
    return ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled').get('AXLabel') or ''


def open_profile(ui):
    ui.element('profile-screen', timeout=45)
    return ui.element('profile-name', timeout=30)


def ys(items, *identifiers):
    found = []
    for identifier in identifiers:
        element = by_id(items, identifier)
        assert element is not None, f'{identifier} is missing'
        found.append(element['frame']['y'])
    return found


def assert_order(items, *identifiers):
    positions = ys(items, *identifiers)
    assert positions == sorted(positions), f'order {identifiers} reads {positions}'


def review_ids(items):
    rows = [i for i in items if (i.get('AXUniqueId') or '').startswith('profile-review-')
            and not i['AXUniqueId'].endswith(('-reply', '-reply-button'))]
    return [i['AXUniqueId'] for i in sorted(rows, key=lambda i: i['frame']['y'])]


def review_id(n):
    return f'profile-review-fixture-profile-review-{n:03d}'


def within_width(items, identifier):
    width = items[0]['frame']['width']
    f = by_id(items, identifier)['frame']
    assert f['x'] >= 0 and f['x'] + f['width'] <= width + 0.5, f'{identifier} overflows: {f}'


def intrinsic_width(ui, text):
    binary = compiled('textwidth', SIMULATOR)
    proc = subprocess.run(['xcrun', 'simctl', 'spawn', ui.udid, str(binary), text], capture_output=True, text=True,
                          check=True, timeout=20)
    return float(proc.stdout)


def assert_tier_whole(ui):
    # VoiceOver reads the whole label of a truncated Text, and AX reports no rendered string: only the frame shows it.
    tiers = [ui.t(f'bounty.tier.{tier}') for tier in ('new_friend', 'reliable', 'very_reliable', 'tapir_friend')]
    text = ui.settled(lambda items: next((i for i in items if i.get('type') == 'StaticText'
                                          and i.get('AXLabel') in tiers), None), 'the tier text never settled')
    need = intrinsic_width(ui, text['AXLabel'])
    assert text['frame']['width'] >= need - 1, f"{text['AXLabel']} is cut: {text['frame']['width']} of {need} pt"


def menu_more(ui):
    ui.tap_label(ui.t('reputation.profile.more'))


def tap_item(ui, label_text):
    found = ui.settled(lambda items: next((i for i in reversed(items) if i.get('AXLabel') == label_text), None),
                       f'{label_text} never settled')
    f = found['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)


def tap_button(ui, label_text):
    found = ui.settled(lambda items: next((i for i in reversed(items) if i.get('AXLabel') == label_text
                                           and i.get('type') == 'Button'), None), f'no {label_text} button')
    f = found['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)


def on_screen(items, identifier, bottom_inset=90):
    element = by_id(items, identifier)
    if element is None:
        return None
    f, height = element['frame'], items[0]['frame']['height']
    return element if f['y'] >= 100 and f['y'] + f['height'] <= height - bottom_inset else None


def tab_bar_top(items):
    return min(i['frame']['y'] for i in items if i.get('type') == 'RadioButton')


def assert_clears_tab_bar(ui, identifier, tries=6):
    from gestures import drag
    for drags in range(tries):
        ui.at_rest()
        items = ui.read()
        f, top = by_id(items, identifier)['frame'], tab_bar_top(items)
        print(f"{identifier}: bottom {f['y'] + f['height']:.0f}, tab bar top {top:.0f}, {drags} drags")
        if f['y'] + f['height'] <= top:
            return
        w, h = items[0]['frame']['width'], items[0]['frame']['height']
        drag(ui, (w / 2, h * 0.7), (w / 2, h * 0.3))
    raise AssertionError(f'{identifier} stays under the tab bar after {tries} drags: {f} vs {top}')


def scroll_to(ui, identifier, tries=12):
    from gestures import drag
    for _ in range(tries):
        items = ui.read()
        found = on_screen(items, identifier)
        if found:
            return found
        w, h = items[0]['frame']['width'], items[0]['frame']['height']
        element = by_id(items, identifier)
        if element is not None and element['frame']['y'] < 100:
            drag(ui, (w / 2, h * 0.35), (w / 2, h * 0.65))
        else:
            drag(ui, (w / 2, h * 0.7), (w / 2, h * 0.3))
    raise AssertionError(f'{identifier} never scrolled into view')


def report_review(ui, identifier, shot=None):
    scroll_to(ui, identifier)
    ui.at_rest()
    ui.press(identifier, 1.2)
    ui.labelled(ui.t('chat.thread.report'))
    if shot:
        ui.at_rest()
        ui.capture(shot)
    ui.tap_label(ui.t('chat.thread.report'))
    ui.element('profile-report', timeout=30)


def submit_report(ui):
    found = ui.wait(lambda items: next((i for i in items if i.get('AXLabel') == ui.t('chat.report.submit')
                                        and i.get('type') == 'Button' and i.get('enabled') is True), None),
                    '提交 is not live')
    f = found['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)
