"""Helper actions on the 7A status screen (59B, 60A, 61A). Assigned: 出发 opens the ETA sheet (a medium-detent sheet with
the system wheel) at now + 30 minutes rounded up to five, and nothing is sent while it is open; 出发 in the sheet sends
start_bounty with that time and the timeline shows 你出发了 with 预计 … 到. 改预计到达时间 opens the same sheet at the current
ETA with 好 disabled until the wheel moves; after 好 the new time flips in and the old one is struck through (clip
eta-change). 完成 shows progress in the button while complete_bounty is in flight, then 等小林确认. With
complete_bounty failing once, 完成 shows 没发出去，再试一次 under the buttons and the button comes back; the next tap
completes. Closing the sheet with 取消 sends nothing."""
import json
import re
import sys
import tempfile
import time
from datetime import datetime, timedelta

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen  # noqa: E402
from bounty import relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import assert_touch_target, by_id, UI  # noqa: E402
from recording import clip, frames  # noqa: E402

DEPS = ['src/features/bounty/status/', 'src/features/bounty/shared/', 'src/ui/SheetFrame.tsx', 'src/ui/PillButton.tsx',
        'modules/tapiro-kit/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py', 'verification/ui/choose.py',
        'verification/ui/recording.py']
SCENE = 'bounty-status'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 420
FIRST = ['-uiVerifyBountyStatus', 'assigned', '-uiVerifyBountyRole', 'helper']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyStatus', 'assigned', '-uiVerifyBountyRole', 'helper',
        '-uiVerifyBountyStatusDelayMs', '4000']
CALLS = 'uiVerifyBountyStatusCalls'
CLOCK = r'\d{1,2}[:.]\d{2}'

ui = UI(*sys.argv[1:])


def calls():
    text = defaults(ui, CALLS)
    return json.loads(text) if text else []


def sent(name):
    return [call for call in calls() if call['name'] == name]


def wait_sent(name, count, timeout=20):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        found = sent(name)
        if len(found) >= count:
            return found
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
    raise AssertionError(f'{name} was sent {len(sent(name))} times, expected {count}')


def step(identifier):
    return ui.settled(lambda items: by_id(items, f'bounty-status-step-{identifier}'),
                      f'step {identifier} never settled').get('AXLabel') or ''


def summary(key, **values):
    return ui.wait_label('bounty-status-summary', lambda text: text == ui.t(key, **values),
                         f'the summary never read {ui.t(key, **values)!r}')


def clock(at):
    twelve = at.hour % 12 or 12
    return rf'(?:0?{at.hour}|0?{twelve})[:.]{at.minute:02d}'


def default_eta(now):
    base = now.replace(second=0, microsecond=0) + timedelta(minutes=30)
    if now.second or now.microsecond:
        base += timedelta(minutes=1)
    return base + timedelta(minutes=(-base.minute) % 5)


def open_sheet(action, title_key):
    ui.tap(f'bounty-status-action-{action}')
    ui.element('bounty-eta-picker')
    ui.labelled(ui.t(title_key))
    ui.at_rest()


def bar_button(identifier):
    def match(items):
        found = [i for i in items if i.get('AXUniqueId') == identifier]
        return next((i for i in found if i.get('type') == 'Button'), found[0] if found else None)
    return ui.settled(match, f'{identifier} never settled')


def tap_bar(identifier):
    f = bar_button(identifier)['frame']
    ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)


def confirm_button():
    return bar_button('bounty-eta-confirm')


step('selected')
summary('bounty.status.summary.helper.assigned')
start = by_id(ui.read(), 'bounty-status-action-start')
assert start and start.get('AXLabel') == ui.t('bounty.status.action.start'), start
assert_touch_target(start, '出发')

opened = datetime.now()
open_sheet('start', 'bounty.eta.title')
assert confirm_button().get('AXLabel') == ui.t('bounty.eta.start'), confirm_button()
ui.capture('01-eta-sheet')
assert not sent('start_bounty'), f'start_bounty was sent while the sheet was open: {sent("start_bounty")}'

tap_bar('bounty-eta-cancel')
ui.gone('bounty-eta-picker')
time.sleep(1.0)  # a stray send would reach the plist within this
assert not sent('start_bounty'), '取消 in the ETA sheet still started the bounty'
summary('bounty.status.summary.helper.assigned')

opened = datetime.now()
open_sheet('start', 'bounty.eta.title')
tap_bar('bounty-eta-confirm')
ui.gone('bounty-eta-picker')
eta = wait_sent('start_bounty', 1)[0]['args']['eta']
eta_at = datetime.fromisoformat(eta.replace('Z', '+00:00')).astimezone()
assert eta_at > datetime.now().astimezone() + timedelta(minutes=25), f'start_bounty sent {eta}, not about 30 min ahead'
expected = {default_eta(opened + timedelta(seconds=delay)).astimezone() for delay in (0, 20)}
assert eta_at in expected, \
    f'the untouched wheel sent {eta_at:%H:%M}, not now + 30 min rounded up to 5 ({sorted(f"{at:%H:%M}" for at in expected)})'
summary('bounty.status.summary.helper.enRoute')
started = step('started')
assert re.search(ui.pattern('bounty.status.note.eta', time=clock(eta_at)), started), \
    f'the timeline does not show the ETA {clock(eta_at)}: {started!r}'
items = ui.read()
change = by_id(items, 'bounty-status-action-changeEta')
complete = by_id(items, 'bounty-status-action-complete')
assert change and complete, 'en route has no 完成 and 改预计到达时间'
assert complete['frame']['y'] < change['frame']['y'], '完成 is not the primary (upper) button'
ui.at_rest()
ui.capture('02-en-route')

open_sheet('changeEta', 'bounty.eta.changeTitle')
ok = confirm_button()
assert ok.get('AXLabel') == ui.t('bounty.eta.ok'), ok
assert ok.get('enabled') is False, f'好 is enabled before the wheel moved: {ok}'
wheel = ui.element('bounty-eta-picker')['frame']
x = wheel['x'] + wheel['width'] * 0.62
middle = wheel['y'] + wheel['height'] / 2
ui.swipe((x, middle + 40), (x, middle - 40), 0.4)
ui.wait(lambda items: any(i.get('AXUniqueId') == 'bounty-eta-confirm' and i.get('type') == 'Button'
                          and i.get('enabled') is True for i in items), '好 never enabled after the wheel moved')
ui.at_rest()
ui.capture('03-eta-changed-in-sheet')
with clip(ui, 'eta-change') as video:
    tap_bar('bounty-eta-confirm')
    update = wait_sent('update_eta', 1)[0]
    ui.wait_label('bounty-status-step-started',
                  lambda text: re.search(ui.pattern('bounty.eta.previous', time=clock(eta_at)), text),
                  'the old time never shows struck after 好')
    ui.at_rest()
new_at = datetime.fromisoformat(update['args']['eta'].replace('Z', '+00:00')).astimezone()
assert new_at != eta_at, f'update_eta sent the same time {update}'
started = step('started')
assert re.search(ui.pattern('bounty.status.note.eta', time=clock(new_at)), started), \
    f'the new ETA {clock(new_at)} is not shown: {started!r}'
assert re.search(ui.pattern('bounty.eta.changedSelf', time=CLOCK), started), started
ui.capture('04-eta-struck')
with tempfile.TemporaryDirectory() as tmp:
    samples = frames(video, tmp)
print(f'eta-change clip: {len(samples)} distinct frames')
assert len(samples) >= 3, f'the ETA change clip has {len(samples)} distinct frames; nothing moved'

ui.tap('bounty-status-action-complete')
ui.wait(lambda items: (by_id(items, 'bounty-status-action-complete') or {}).get('enabled') is False,
        '完成 shows no progress while complete_bounty is in flight', timeout=5)
ui.capture('05-completing')
summary('bounty.status.summary.helper.done', name='小林')
ui.gone('bounty-status-action-complete')
assert len(wait_sent('complete_bounty', 1)) == 1, sent('complete_bounty')
ui.at_rest()
ui.capture('06-done')

relaunch(ui, drop=FIRST, add=['-uiVerifyScene', SCENE, '-uiVerifyBountyStatus', 'enRoute', '-uiVerifyBountyRole',
                              'helper', '-uiVerifyBountyStatusFail', 'complete_bounty'],
         ready='bounty-status-step-selected')
summary('bounty.status.summary.helper.enRoute')
ui.tap('bounty-status-action-complete')
ui.wait_label('bounty-status-failed', lambda text: text == ui.t('bounty.status.failed'),
                       'no inline failure notice after complete_bounty failed')
ui.wait(lambda items: (by_id(items, 'bounty-status-action-complete') or {}).get('enabled') is True,
        '完成 did not come back after the failure')
summary('bounty.status.summary.helper.enRoute')
assert len(wait_sent('complete_bounty', 1)) == 1, f'complete_bounty was replayed: {sent("complete_bounty")}'
items = ui.read()
notice = by_id(items, 'bounty-status-failed')
s = screen(items)
assert notice['frame']['y'] + notice['frame']['height'] <= s['height'], f'the failure notice is off screen: {notice}'
ui.at_rest()
ui.capture('07-complete-failed')
ui.tap('bounty-status-action-complete')
summary('bounty.status.summary.helper.done', name='小林')
assert len(wait_sent('complete_bounty', 2)) == 2, sent('complete_bounty')
ui.gone('bounty-status-failed')
print('PASS: ETA sheet before start, cancel sends nothing, start with ETA, change with the old time struck, '
      'complete with progress, failed complete with the inline notice and a manual retry')
