"""When 阿杰 has no way to receive money, the pay sheet's yellow card offers 发消息提醒 (44 pt). Tapping it closes the
sheet and opens the bounty's conversation with a reminder already in the composer, unsent."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, reach_home  # noqa: E402

DEPS = ['src/features/payment/', 'src/app/pay/', 'src/features/chat/drafts.ts', 'src/features/chat/useItemChat.ts',
        'src/app/(tabs)/messages/']
LOCALES = ['zh-Hans', 'ms']
BUTTON_FROM_BOTTOM = 73
ARGS = ['-uiVerifyShellFeed', 'oweMoney', '-uiVerifyPayMethods', 'none', '-uiVerifyChat', '1',
        '-uiVerifySignedIn', 'onboarded']

ui = UI(*sys.argv[1:])
reach_home(ui)
card = ui.settled(lambda items: by_id(items, 'live-card-oweMoney'), 'pay card missing')
f = card['frame']
ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] - BUTTON_FROM_BOTTOM)
ui.element('pay-no-methods', timeout=15)
remind = ui.element('pay-remind')
assert remind.get('AXLabel') == ui.t('pay.sheet.none.remind'), remind.get('AXLabel')
assert_touch_target(remind, 'pay-remind')
body = ui.t('pay.sheet.none.body')
assert any(body in (i.get('AXLabel') or '') for i in ui.read()), f'the card body is not {body!r}'
ui.capture('01-none')

ui.tap('pay-remind')
items = ui.wait(lambda items: by_id(items, 'chat-composer-input') and items, 'the conversation did not open', timeout=20)
value = by_id(items, 'chat-composer-input').get('AXValue') or ''
opening = ui.t('pay.sheet.none.draft', title='X').split('X')[0]
assert value.startswith(opening) and len(value) > len(opening), f'the composer holds {value!r}'
assert by_id(items, 'pay-sheet') is None, 'the pay sheet stayed open over the conversation'
ui.capture('02-thread')
print('PASS: no-method pay sheet reminds through the conversation')
