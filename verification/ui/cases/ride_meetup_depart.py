"""The organiser at 集合 (196 A–198 A). At 06:29 the ticket's 车牌 cell reads VEN 2381 over 白色 Alza, 导航到集合点,
打开 Grab and 填车牌 are shown, 阿杰's avatar reads 晚到 5 分 with the line 「阿杰 hh:mm 说晚到 5 分钟 · 约 hh:mm」 and the
bottom reads 「阿明、小雅到了 · hh:mm 出发」 over 出发 · 勾选谁上了车. At 06:36 出发 opens the boarding sheet with you
(发起人) fixed on, 阿明 and 小雅 pre-ticked and 阿杰 off, the no-show consequence naming 阿杰 and 「3 人出发」; confirming
sends depart_ride once with 阿明 and 小雅 and the ticket reads 已出发."""
import json
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from choose import defaults  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from ride import tap_bar  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py', 'src/ui/PillButton.tsx']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'meetupLate']
CALLS = 'uiVerifyRideDetailCalls'
CLOCK = r'\d{2}:\d{2}'
MING, YA, JIE = 'fixture-ride-aming', 'fixture-ride-xiaoya', 'fixture-ride-ajie'

ui = UI(*sys.argv[1:])


def calls(name):
    text = defaults(ui, CALLS)
    return [call for call in (json.loads(text) if text else []) if call['name'] == name]


ticket = ui.element('ride-detail-ticket').get('AXLabel') or ''
assert f"{ui.t('ride.detail.cell.plate')} VEN 2381 白色 Alza" in ticket, ticket
items = ui.read()
for identifier in ('ride-detail-navigate', 'ride-detail-grab', 'ride-detail-plate'):
    tile = by_id(items, identifier)
    assert tile, f'{identifier} is missing'
    assert_touch_target(tile, identifier)
late = ui.element(f'ride-detail-arrival-{JIE}').get('AXLabel')
assert late == ui.t('ride.detail.arrival.a11y', name='阿杰', state=ui.tn('ride.detail.arrival.late', 5)), late
line = ui.element(f'ride-detail-late-{JIE}').get('AXLabel') or ''
assert re.fullmatch(ui.pattern('ride.detail.arrival.lateLine_other', name='阿杰', at=CLOCK, count='5', until=CLOCK), line), line
depart_line = ui.element('ride-detail-depart-line').get('AXLabel') or ''
names = ui.t('ride.detail.listJoin').join(['阿明', '小雅'])
assert re.fullmatch(ui.pattern('ride.detail.meetup.departLine', names=re.escape(names), time=CLOCK), depart_line), \
    depart_line
assert ui.element('ride-detail-depart').get('AXLabel') == ui.t('ride.detail.meetup.depart')
ui.at_rest()
ui.capture('01-late')

relaunch(ui, drop=['-uiVerifyRideDetail', 'meetupLate'], add=['-uiVerifyRideDetail', 'depart', '-uiVerifyScene', SCENE],
         ready='ride-detail-depart')
countdown = ui.element('ride-detail-ticket').get('AXLabel') or ''
assert re.match(r'\d+ ' + re.escape(ui.tn('ride.detail.countdownLate', 6)), countdown), countdown
ui.tap('ride-detail-depart')
ui.element('ride-depart')
for member, on in ((MING, '1'), (YA, '1'), (JIE, '0')):
    toggle = ui.element(f'ride-depart-{member}')
    assert str(toggle.get('AXValue')) == on, f'{member} toggle is {toggle.get("AXValue")}, expected {on}'
assert ui.element('ride-depart-consequence').get('AXLabel') == ui.t('ride.detail.depart.consequence', names='阿杰')
confirm = ui.element('ride-depart-confirm')
assert confirm.get('AXLabel') == ui.tn('ride.detail.depart.confirm', 3), confirm.get('AXLabel')
ui.at_rest()
ui.capture('02-sheet')
tap_bar(ui, 'ride-depart-confirm')
ui.gone('ride-depart')
ui.wait_label('ride-detail-ticket', lambda label: (label or '').startswith(ui.t('ride.ticket.departed')),
              'the ticket never read 已出发')
deadline = time.monotonic() + 10
while time.monotonic() < deadline and not calls('depart'):
    time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
sent = calls('depart')
assert len(sent) == 1 and sorted(sent[0]['args']['boarded']) == sorted([MING, YA]), sent
ui.capture('03-departed')
print('PASS: plate cell, organiser tiles, late line, boarding sheet pre-ticks and 3 人出发')
