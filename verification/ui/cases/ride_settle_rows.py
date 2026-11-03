"""The organiser at 07:40, one paid and one not (214 A, 216 A, 218 A). The ticket leads with 「0/2 人的钱收到了」 and the
cells 每人 RM 24.70 / 你出 RM 24.60; the 结清 step reads 等你确认 1 笔. 阿明's row says TNG · hh:mm 说已付 · 有截图 with 看截图,
还没收到 and 已收到; 小雅's row says 还没付 with no button, and the footnote says Tapiro reminds, with no nudge button.
已收到 on 阿明 sends one confirm and plays no celebration (小雅 still owes); the row then reads 收到."""
import json
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from choose import defaults  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/ride/', 'src/features/payment/', 'src/app/(tabs)/ride/', 'src/lib/i18n/locales/rideSettle/']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'paidSome']
CALLS = 'uiVerifyRideDetailCalls'
MING, YA = 'fixture-ride-aming', 'fixture-ride-xiaoya'
CLOCK = r'\d{2}:\d{2}'

ui = UI(*sys.argv[1:])

ticket = ui.element('ride-detail-ticket').get('AXLabel') or ''
assert f"0/2 {ui.t('rideSettle.ticket.leadReceived')}" in ticket, ticket
assert ui.element('ride-detail-settle-title').get('AXLabel') == ui.tn('rideSettle.steps.settleConfirm', 1)
sub = ui.element(f'ride-settle-sub-{MING}').get('AXLabel') or ''
assert re.fullmatch(ui.pattern('rideSettle.rows.saidPaid', method='.+', time=CLOCK) + re.escape(ui.t('rideSettle.rows.proof')),
                    sub), sub
assert ui.element(f'ride-settle-sub-{YA}').get('AXLabel') == ui.t('rideSettle.rows.due')
items = ui.read()
for identifier in (f'ride-settle-proof-{MING}', f'ride-settle-not-received-{MING}', f'ride-settle-confirm-{MING}'):
    button = by_id(items, identifier)
    assert button, f'{identifier} is missing'
    assert_touch_target(button, identifier)
assert by_id(items, f'ride-settle-confirm-{YA}') is None, 'an unpaid row offers 已收到'
assert by_id(items, 'ride-settle-reminder'), 'the Tapiro reminder line is missing'
assert not any('提醒一下' in (i.get('AXLabel') or '') for i in items), 'an organiser nudge button appeared (216 A)'
ui.at_rest()
ui.snap('01-rows')

ui.tap(f'ride-settle-confirm-{MING}')
ui.wait_label(f'ride-settle-sub-{MING}', lambda label: bool(re.fullmatch(ui.pattern('rideSettle.rows.received', time=CLOCK),
                                                                         label or '')), '阿明 never read 收到')
deadline = time.monotonic() + 10
sent = []
while time.monotonic() < deadline and not sent:
    text = defaults(ui, CALLS)
    sent = [call for call in (json.loads(text) if text else []) if call['name'] == 'confirmReceived']
    time.sleep(0.5)  # NSUserDefaults reaches the plist asynchronously
assert len(sent) == 1, sent
assert by_id(ui.read(), 'celebration') is None, 'an earlier 已收到 played the celebration (218 A)'
ui.capture('02-one-received')
print('PASS: per-person rows, one 已收到, no celebration before the last')
