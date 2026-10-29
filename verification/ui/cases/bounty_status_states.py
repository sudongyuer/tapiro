"""Status screen 7A pushed from the bounty-status scene with a back button to 悬赏. Poster, en route with a changed ETA:
阿杰在路上, the 出发了 step done with 预计 … 到, the old time 原来是 … drawn struck through (a continuous ink run across
the line, unlike the ETA line above it), 阿杰 … 改了时间, the 点完成 step current, no pinned button and the ⋯ menu.
Poster, done: 等你确认, the confirm step needs you with the auto-confirm date and 47–48 hours left, and 确认完成 and 有问题
pinned below the list, at least 44 pt. Helper, disputed: 小林说有问题, the 完成 step needs you with the poster's reason
and the 48-hour line, and 处理好了，再点完成 pinned. Scrolled to the end, the pay step and the rows below it stay above the
pinned actions, which float over the list with the system scroll edge effect. A first-load failure shows only the load-failed card, and 重试 brings
the timeline. A failed pull keeps the timeline under the refresh notice with the time of the data."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, assert_touch_target, by_id, luma  # noqa: E402
from ocr import lines  # noqa: E402

DEPS = ['src/features/bounty/status/', 'src/features/bounty/shared/', 'src/features/bounty/post/timeText.ts',
        'src/ui/NoticeCard.tsx', 'src/ui/PillButton.tsx',
        'src/ui/SheetFrame.tsx', 'modules/tapiro-kit/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'verification/ui/ocr.py']
SCENE = 'bounty-status'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 360
FIRST = ['-uiVerifyBountyStatus', 'enRouteChanged', '-uiVerifyBountyRole', 'poster']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyStatus', 'enRouteChanged', '-uiVerifyBountyRole', 'poster']
REASON = '快递盒子压坏了，里面的杯子碎了一个'
CLOCK = r'\d{1,2}[:.]\d{2}'
LIST_ROWS = ('bounty-status-step-', 'bounty-status-address')
STRUCK_SHARE = 0.6
INK_CONTRAST = 40

ui = UI(*sys.argv[1:])


def step(identifier):
    return ui.settled(lambda items: by_id(items, f'bounty-status-step-{identifier}'),
                      f'step {identifier} never settled').get('AXLabel') or ''


def label(identifier):
    return ui.element(identifier).get('AXLabel') or ''


def state(key):
    return ui.t(f'bounty.status.a11y.{key}')


def restart(scenario, role, extra=(), ready='bounty-status-step-selected'):
    relaunch(ui, drop=FIRST, add=['-uiVerifyScene', SCENE, '-uiVerifyBountyStatus', scenario,
                                  '-uiVerifyBountyRole', role, *extra], ready=ready)


def longest_run(shot, box):
    background = luma(shot.rgb(box['x'] - 4, box['y'] + box['height'] / 2))
    best = 0
    for row in range(round(box['height'] * 0.3), round(box['height'] * 0.75) + 1):
        y = box['y'] + row
        run = 0
        for col in range(round(box['width'])):
            if abs(luma(shot.rgb(box['x'] + col, y)) - background) > INK_CONTRAST:
                run += 1
                best = max(best, run)
            else:
                run = 0
    return best / box['width']


def ocr_line(read, key):
    pattern = re.compile(ui.pattern(key, time=CLOCK).replace('\\ ', r'[\s\-–]*'))
    found = [line for line in read if pattern.search(line['text'])]
    assert found, f'no line matching {pattern.pattern!r} in {[line["text"] for line in read]}'
    return found[0]


def list_bottom(items):
    rows = [i for i in items if (i.get('AXUniqueId') or '').startswith(LIST_ROWS)]
    return max(rows, key=lambda i: i['frame']['y'] + i['frame']['height'])


def assert_pinned_below(identifier, name):
    items = ui.read()
    button, form = by_id(items, identifier), by_id(items, 'bounty-status')
    assert button and form, f'{name} or the status list is missing'
    assert_touch_target(button, name)
    s = screen(items)
    for _ in range(3):
        ui.swipe((s['width'] / 2, s['height'] * 0.6), (s['width'] / 2, s['height'] * 0.2), 0.4)
    ui.at_rest()
    items = ui.read()
    pinned = min(i['frame']['y'] for i in items if (i.get('AXUniqueId') or '').startswith('bounty-status-action-'))
    last = list_bottom(items)
    bottom = last['frame']['y'] + last['frame']['height']
    assert bottom <= pinned, f'{last.get("AXUniqueId")} ends at {bottom}, under the pinned actions at {pinned}'
    payment = by_id(items, 'bounty-status-step-payment')
    assert payment and payment['frame']['y'] + payment['frame']['height'] <= pinned, \
        f'the pay step is not above the pinned actions: {payment and payment["frame"]}, pinned at {pinned}'
    return by_id(items, identifier)


started = step('started')
assert label('bounty-status-summary') == ui.t('bounty.status.summary.poster.enRoute', name='阿杰'), \
    label('bounty-status-summary')
assert label('bounty-status-title') == '帮取快递', label('bounty-status-title')
assert ui.t('bounty.status.step.poster.started', name='阿杰') in started, started
for key in ('bounty.status.note.eta', 'bounty.eta.previous', 'bounty.eta.changed'):
    assert re.search(ui.pattern(key, time=CLOCK, name='阿杰'), started), f'{key} missing from {started!r}'
assert started.endswith(state('done')), started
assert step('completed').endswith(state('current')), step('completed')
paid = ui.t('bounty.status.step.poster.paid', name='阿杰', amount='RM\u00a08')
assert step('payment').startswith(paid), f'the pay step reads {step("payment")!r}, expected {paid!r}'
items = ui.read()
assert not any((i.get('AXUniqueId') or '').startswith('bounty-status-action-') for i in items), \
    'the poster has a pinned action while the helper is en route'
top = [i.get('AXLabel') for i in items if i.get('type') == 'Button' and i['frame']['y'] < 120]
assert ui.t('shell.home.title') in top, f'no back button to {ui.t("shell.home.title")}: {top}'
assert ui.t('bounty.status.action.more') in top, f'no ⋯ menu in the header: {top}'
ui.at_rest()
shot = ui.snap('01-poster-en-route')
read = lines(shot)
struck = longest_run(shot, ocr_line(read, 'bounty.eta.previous'))
plain = longest_run(shot, ocr_line(read, 'bounty.status.note.eta'))
print(f'ink run across the old time {struck:.2f}, across the ETA {plain:.2f}')
assert struck >= STRUCK_SHARE, f'the old time is not struck through (longest ink run {struck:.2f} of its width)'
assert plain < STRUCK_SHARE, f'the ETA line looks struck too ({plain:.2f}), so the measure cannot tell'

restart('done', 'poster')
assert label('bounty-status-summary') == ui.t('bounty.status.summary.poster.done'), label('bounty-status-summary')
confirm = step('confirmed')
auto = ui.pattern('bounty.status.note.autoConfirmPoster_other', date='.+', count='4[78]')
assert re.search(auto, confirm), f'no auto-confirm line in {confirm!r}'
assert confirm.endswith(state('needsYou')), confirm
assert_pinned_below('bounty-status-action-confirm', '确认完成')
assert_pinned_below('bounty-status-action-reportIssue', '有问题')
items = ui.read()
first, second = by_id(items, 'bounty-status-action-confirm'), by_id(items, 'bounty-status-action-reportIssue')
assert first.get('AXLabel') == ui.t('bounty.status.action.confirm'), first.get('AXLabel')
assert second.get('AXLabel') == ui.t('bounty.status.action.problem'), second.get('AXLabel')
assert first['frame']['y'] < second['frame']['y'], f'确认完成 is not above 有问题: {first["frame"]} {second["frame"]}'
ui.at_rest()
ui.capture('02-poster-done')

restart('disputed', 'helper')
assert label('bounty-status-summary') == ui.t('bounty.status.summary.helper.disputed', name='小林'), \
    label('bounty-status-summary')
completed = step('completed')
assert ui.t('bounty.status.note.reason', reason=REASON) in completed, completed
assert ui.t('bounty.status.note.disputeHelper') in completed, completed
assert completed.endswith(state('needsYou')), completed
again = assert_pinned_below('bounty-status-action-completeAgain', '处理好了，再点完成')
assert again.get('AXLabel') == ui.t('bounty.status.action.completeAgain'), again.get('AXLabel')
ui.at_rest()
ui.capture('03-helper-disputed')

restart('enRoute', 'poster', ['-uiVerifyBountyStatusLoad', 'firstFails'], ready='bounty-status-load-failed')
assert ui.t('bounty.status.loadFailed') in label('bounty-status-load-failed'), label('bounty-status-load-failed')
items = ui.read()
for absent in ('bounty-status-step-selected', 'bounty-status-summary', 'bounty-status-stale'):
    assert by_id(items, absent) is None, f'a failed first load still shows {absent}'
ui.at_rest()
ui.capture('04-first-load-failed')
ui.tap('bounty-status-retry')
step('started')
ui.gone('bounty-status-load-failed')

restart('enRoute', 'poster', ['-uiVerifyBountyStatusLoad', 'refreshFails'])
assert by_id(ui.read(), 'bounty-status-stale') is None, 'the refresh notice shows before a refresh failed'
s = screen(ui.read())
ui.swipe((s['width'] / 2, s['height'] * 0.3), (s['width'] / 2, s['height'] * 0.8), 0.6)
stale = ui.wait_label('bounty-status-stale',
                      lambda text: re.search(ui.pattern('bounty.status.refreshFailed', time=CLOCK), text),
                      'the failed pull shows no refresh notice with the data time')
for identifier in ('selected', 'started', 'completed', 'confirmed', 'payment'):
    step(identifier)
assert label('bounty-status-summary') == ui.t('bounty.status.summary.poster.enRoute', name='阿杰')
ui.at_rest()
ui.capture('05-refresh-failed')
print('PASS: en route struck ETA, done with two pinned buttons, disputed reason, load-failed card, refresh notice')
