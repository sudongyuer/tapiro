"""Worst-case status screen and bounty home cards (break-ui), with a 60-code-point title, RM 500, a 39-character
poster and a 40-character helper. Poster, disputed: the title wraps, RM 500 shows in full, the summary names the helper,
the 140-code-point reason reads in full in the 点完成 step, and scrolled to the end the pay step stays above the pinned
确认完成. Helper, assigned three days ahead: the departure line carries the day, not only the clock, and 出发 is pinned.
Poster, en route with an ETA tomorrow: 预计 明天 … 到 above the struck old time. Poster, two days late: the late line
counts hours. A counterpart without a name reads 对方 (in Malay, 「Pihak lain」 starts the sentence upper-case). On home, four live bounty cards with the same data: the front
card names the title, step and RM 500 for VoiceOver, its title wraps inside the card, an arrival tomorrow carries the
day, the applicant's 等…选 card names the poster, and fanned out every card stays inside the screen."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import screen  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/bounty/status/', 'src/features/bounty/live/', 'src/features/bounty/shared/',
        'src/features/bounty/post/timeText.ts', 'src/features/home/', 'src/ui/SheetFrame.tsx', 'src/ui/LiveCard.tsx',
        'modules/tapiro-kit/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py']
SCENE = 'bounty-status'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 420
FIRST = ['-uiVerifyBountyStatus', 'disputed', '-uiVerifyBountyRole', 'poster']
WORST = ['-uiVerifyBountyStatusData', 'worst']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyStatus', 'disputed', '-uiVerifyBountyRole', 'poster',
        '-uiVerifyBountyStatusData', 'worst']
TITLE_START = '帮我从 Sunway Pyramid 搬三个很重的行李箱'
POSTER = 'Wan Nurul Aisyah binti Wan Abdul Rahman'
HELPER = 'Muhammad Hafiz Haikal bin Mohd Yusof Ali'
REASON_START = 'Kotak bungkusan remuk dan dua cawan di dalamnya pecah.'
REASON_END = '另外少了一包纸巾，'
CLOCK = r'\d{1,2}[:.]\d{2}'
DATED = r'\S.*\S\s' + CLOCK
LIVE = ['-uiVerifyShellFeed', 'none', '-uiVerifyBountyLive', 'posterDone,posterEnRoute,helperAssigned,applicantWaiting',
        '-uiVerifyBountyLiveData', 'worst']
EDGE = 1

ui = UI(*sys.argv[1:])


def label(identifier):
    return ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled').get('AXLabel') or ''


def sentence_case(text):
    return text[:1].upper() + text[1:]


def restart(scenario, role, data='worst'):
    relaunch(ui, drop=[*FIRST, *WORST], add=['-uiVerifyScene', SCENE, '-uiVerifyBountyStatus', scenario,
                                            '-uiVerifyBountyRole', role, '-uiVerifyBountyStatusData', data],
             ready='bounty-status-step-selected')


def scroll_end(items):
    s = screen(items)
    for _ in range(4):
        ui.swipe((s['width'] / 2, s['height'] * 0.6), (s['width'] / 2, s['height'] * 0.2), 0.4)
    ui.at_rest()
    return ui.read()


summary = label('bounty-status-summary')
assert summary == ui.t('bounty.status.summary.poster.disputed', name=HELPER), summary
title = ui.element('bounty-status-title')
reward = ui.element('bounty-status-reward')
assert (title.get('AXLabel') or '').startswith(TITLE_START), title.get('AXLabel')
assert title['frame']['height'] >= 2 * 20, f'the 60-code-point title did not wrap: {title["frame"]}'
assert re.search(r'500', reward.get('AXLabel') or ''), reward.get('AXLabel')
width = screen(ui.read())['width']
for name, element in (('title', title), ('reward', reward)):
    f = element['frame']
    assert f['x'] >= EDGE and f['x'] + f['width'] <= width - EDGE, f'the {name} runs off the screen: {f}'
completed = label('bounty-status-step-completed')
assert REASON_START in completed and REASON_END in completed, f'the reason is cut: {completed!r}'
ui.at_rest()
ui.capture('01-poster-disputed-top')
items = scroll_end(ui.read())
confirm = by_id(items, 'bounty-status-action-confirm')
assert confirm, '确认完成 is not pinned'
assert_touch_target(confirm, '确认完成')
payment = by_id(items, 'bounty-status-step-payment')
assert payment and payment['frame']['y'] + payment['frame']['height'] <= confirm['frame']['y'], \
    f'the pay step ends under 确认完成: {payment and payment["frame"]}, {confirm["frame"]}'
ui.capture('02-poster-disputed-end')

restart('assigned', 'helper')
started = label('bounty-status-step-started')
assert re.search(ui.pattern('bounty.status.note.departBy', time=DATED), started), \
    f'the departure three days ahead has no day: {started!r}'
assert label('bounty-status-step-selected').startswith(ui.t('bounty.status.step.helper.selected', name=POSTER))
start = ui.element('bounty-status-action-start')
assert_touch_target(start, '出发')
ui.at_rest()
ui.capture('03-helper-assigned')

restart('enRouteChanged', 'poster')
started = label('bounty-status-step-started')
tomorrow = ui.t('bounty.post.confirm.tomorrow')
eta = ui.pattern('bounty.status.note.eta', time=re.escape(tomorrow) + r'\s' + CLOCK)
assert re.search(eta, started), f'the ETA tomorrow does not say {tomorrow}: {started!r}'
assert re.search(ui.pattern('bounty.eta.previous', time=CLOCK), started), started
ui.at_rest()
ui.capture('04-poster-eta-tomorrow')

restart('assignedLate', 'poster')
started = label('bounty-status-step-started')
late = ui.pattern('bounty.status.note.lateHours_other', time=DATED, count='48')
assert re.search(late, started), f'the late line does not count 48 hours: {started!r}'
ui.at_rest()
ui.capture('05-poster-late-days')

restart('enRoute', 'poster', data='unnamed')
unknown = ui.t('bounty.post.unknownName')
expected = sentence_case(ui.t('bounty.status.summary.poster.enRoute', name=unknown))
assert label('bounty-status-summary') == expected, f'{label("bounty-status-summary")!r}, expected {expected!r}'
ui.at_rest()
ui.capture('06-unnamed')

relaunch(ui, drop=[*FIRST, *WORST], add=LIVE)
front = ui.settled(lambda items: by_id(items, 'live-card-bountyAction'), 'the 去确认 card is not in front')
money = ui.t('home.money', amount='500')
front_label = front.get('AXLabel') or ''
assert front_label.startswith(TITLE_START) or TITLE_START in front_label, front_label
assert money in front_label and HELPER in front_label, front_label
ui.at_rest()
ui.capture('07-home-stacked')
ui.tap('live-cards-toggle')
ui.wait_label('live-cards-toggle', lambda text: text == ui.t('home.stack.collapse'), 'the stack did not fan out')
ui.at_rest()
items = ui.read()
cards = [i for i in items if (i.get('AXUniqueId') or '').startswith('live-card-') and 'peek' not in i['AXUniqueId']
         and i['AXUniqueId'] != 'live-cards-toggle']
assert len(cards) >= 3, [i.get('AXUniqueId') for i in cards]
for card in cards:
    f = card['frame']
    assert f['x'] >= 0 and f['x'] + f['width'] <= width, f'{card["AXUniqueId"]} runs off the screen: {f}'
arrival = ui.pattern('bounty.live.poster.enRoute', name=re.escape(HELPER), time=re.escape(tomorrow) + r'\s' + CLOCK)
assert any(re.search(arrival, i.get('AXLabel') or '') for i in cards), \
    f'no card says the arrival is {tomorrow}: {[i.get("AXLabel") for i in cards]}'
waiting = sentence_case(ui.t('bounty.live.applicant.waiting', name=POSTER))
assert any(waiting in (i.get('AXLabel') or '') for i in cards), \
    f'no applicant card reads {waiting!r}: {[i.get("AXLabel") for i in cards]}'
ui.capture('08-home-fanned')
print('PASS: worst status screen and home cards fit, dated times carry the day, late counts hours')
