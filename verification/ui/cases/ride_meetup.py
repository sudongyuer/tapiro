"""集合 for a member at 06:20 (193 A–195 A, 198 A). The ticket becomes the countdown ticket 「10 分钟后出发」 with
集合点 / 车牌 (小林叫车后填) / 到了 2/4 and the airport cells; 导航到集合点 is shown and 打开 Grab is not (organiser only);
the timeline's 集合 step reads 2/4 到了 with the avatar row: 小林 and 阿明 with their times, 阿杰 and you 还没到. The bottom
has 晚到 and 我到了; 我到了 sends mark_ride_arrived once and turns into 「你 hh:mm 到了 · 撤销」 with your avatar timed and
3/4; 撤销 sends undo_ride_arrived once and brings 我到了 back. Nothing says 「可能不是最新」 while loads succeed (199 A)."""
import json
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from choose import defaults  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from ride import assert_ticket_colour, within_screen  # noqa: E402

DEPS = ['src/features/ride/', 'src/app/(tabs)/ride/', 'verification/ui/ride.py', 'src/ui/PillButton.tsx',
        'supabase/migrations/20261102000700_ride_detail.sql']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'meetup']
CALLS = 'uiVerifyRideDetailCalls'
SELF = '00000000-0000-4000-8000-000000000001'
CLOCK = r'\d{2}:\d{2}'

ui = UI(*sys.argv[1:])


def calls(name):
    text = defaults(ui, CALLS)
    return [call for call in (json.loads(text) if text else []) if call['name'] == name]


def wait_calls(name, count, timeout=15):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        if len(calls(name)) >= count:
            break
        time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
    assert len(calls(name)) == count, f'{name} sent {len(calls(name))} times, expected {count}'


def arrival(member):
    return ui.element(f'ride-detail-arrival-{member}').get('AXLabel') or ''


def arrived_cell(count):
    return f"{ui.t('ride.detail.cell.arrived')} {ui.t('ride.detail.cell.arrivedValue', arrived=count, total=4)}"


ticket = ui.element('ride-detail-ticket')
text = ticket.get('AXLabel') or ''
countdown = re.compile(r'(9|10|11) ' + re.escape(ui.tn('ride.detail.countdown', 10)))
assert countdown.match(text), f'the ticket does not lead with the countdown: {text}'
for part in (ui.t('ride.detail.cell.platePending', name='小林'), arrived_cell(2), '双威 → KLIA2'):
    assert part in text, f'ticket label misses {part!r}: {text}'
title = ui.element('ride-detail-meetup-title').get('AXLabel')
assert title == ui.t('ride.detail.steps.meetupArrived', arrived=2, total=4), title
assert re.fullmatch(ui.pattern('ride.detail.arrival.a11y', name='小林', state=CLOCK), arrival('fixture-ride-xiaolin'))
assert arrival('fixture-ride-ajie') == ui.t('ride.detail.arrival.a11y', name='阿杰',
                                            state=ui.t('ride.detail.arrival.waiting')), arrival('fixture-ride-ajie')
assert arrival(SELF) == ui.t('ride.detail.arrival.a11y', name=ui.t('ride.detail.you'),
                             state=ui.t('ride.detail.arrival.waiting')), arrival(SELF)
items = ui.read()
assert by_id(items, 'ride-detail-navigate'), '导航到集合点 is missing'
assert by_id(items, 'ride-detail-grab') is None, '打开 Grab is for the organiser only'
assert by_id(items, 'ride-detail-live-stale') is None, '可能不是最新 shows while loads succeed'
arrive = by_id(items, 'ride-detail-arrive')
assert arrive and arrive.get('AXLabel') == ui.t('ride.detail.meetup.arrive'), arrive
assert_touch_target(arrive, '我到了')
assert by_id(items, 'ride-detail-late'), '晚到 is missing'
for identifier in ('ride-detail-ticket', 'ride-detail-arrive', 'ride-detail-navigate'):
    within_screen(items, identifier)
ui.at_rest()
shot = ui.snap('01-meetup')
assert_ticket_colour(ui, shot, ticket, '--color-ride', 'countdown ticket')

ui.tap('ride-detail-arrive')
ui.wait_label('ride-detail-arrived', lambda label: re.fullmatch(ui.pattern('ride.detail.meetup.arrivedLine', time=CLOCK),
                                                              label or ''), '「你 hh:mm 到了」 never showed')
undo = ui.element('ride-detail-undo')
assert undo.get('AXLabel') == ui.t('ride.detail.meetup.undo'), undo.get('AXLabel')
assert re.fullmatch(ui.pattern('ride.detail.arrival.a11y', name=ui.t('ride.detail.you'), state=CLOCK), arrival(SELF))
ui.wait_label('ride-detail-ticket', lambda label: arrived_cell(3) in (label or ''), 'the ticket never read 3/4')
wait_calls('arrive', 1)
ui.at_rest()
ui.capture('02-arrived')

ui.tap('ride-detail-undo')
ui.element('ride-detail-arrive')
ui.gone('ride-detail-arrived')
wait_calls('undoArrive', 1)
assert len(calls('arrive')) == 1, '我到了 was sent again'
print('PASS: countdown ticket, arrival row, 我到了 with undo, organiser-only Grab, no stale line while connected')
