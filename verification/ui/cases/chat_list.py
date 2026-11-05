"""消息 list (117 A) on the demo fixture: one row per bounty or ride, newest first, each with its art, the title, the other
side (阿杰, 3 人 for the ride group), the last line (yours as 我：…, none as 还没有消息) and the time; only the unread row
has the red dot and the 消息 badge shows. Tapping it pushes the thread titled 阿杰; returning with the back button deselects
the row (an AXe edge swipe does not pop on iOS 27.2, so the interactive pop is a device check), and the read thread loses its dot and the badge. The `one` fixture shows a single row."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from chat import (LIST_GROUND, ROW_FILL, badge_pixels, open_list, row_id, row_label, rows,  # noqa: E402
                  within_screen)
from driver import UI, assert_touch_target, by_id, close  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1']
ORDER = ['fixture-chat-bounty', 'fixture-chat-new', 'fixture-chat-ride']

ui = UI(*sys.argv[1:])
open_list(ui)
items = ui.wait(lambda items: len(rows(items)) == 3 and items, 'the demo list never showed three rows')
assert [row_id(r) for r in rows(items)] == ORDER, [row_id(r) for r in rows(items)]
expected = {
    'fixture-chat-bounty': row_label(ui, '帮取快递', '阿杰', '好的，放好了，拍了照片给你', unread=True),
    'fixture-chat-new': row_label(ui, '帮我买杯奶茶', '小林', ui.t('chat.list.noMessage')),
    'fixture-chat-ride': row_label(ui, ui.t('chat.list.route', **{'from': '双威', 'to': 'KLIA2'}),
                                   ui.tn('chat.list.people', 3),
                                   ui.t('chat.list.mine', body='收到，我穿蓝色外套')),
}
for element in rows(items):
    label = element.get('AXLabel') or ''
    assert expected[row_id(element)].fullmatch(label), f'{row_id(element)} reads {label!r}'
    assert_touch_target(element, row_id(element))
    within_screen(items, element)
assert by_id(items, 'chat-row-fixture-chat-bounty-unread'), 'the unread row has no dot'
for quiet in ORDER[1:]:
    assert by_id(items, f'chat-row-{quiet}-unread') is None, f'{quiet} shows an unread dot'
ui.at_rest()
shot = ui.snap('01-list')
first = rows(items)[0]['frame']
fill = shot.rgb(first['x'] + 4, first['y'] + first['height'] / 2)
assert close(fill, ROW_FILL[ui.appearance], 6), f'row fill is {fill}, expected {ROW_FILL[ui.appearance]}'
ground = shot.rgb(first['x'] / 2, first['y'] + first['height'] / 2)
assert close(ground, LIST_GROUND[ui.appearance], 6), f'list ground is {ground}'
assert badge_pixels(ui, shot, items) > 300, '消息 badge is not drawn for the unread thread'

ui.tap('chat-row-fixture-chat-bounty')
ui.labelled('阿杰')
ui.gone('chat-list')
ui.capture('02-thread')
ui.tap('BackButton')
row = ui.settled(lambda items: by_id(items, 'chat-row-fixture-chat-bounty'), 'back did not return to the list')
ui.gone('chat-row-fixture-chat-bounty-unread')
ui.wait_label('chat-row-fixture-chat-bounty',
              lambda label: bool(row_label(ui, '帮取快递', '阿杰', '好的，放好了，拍了照片给你').fullmatch(label)),
              'the read row still reads unread')
ui.at_rest()
items = ui.read()
shot = ui.snap('03-returned')
f = row['frame']
fill = shot.rgb(f['x'] + 4, f['y'] + f['height'] / 2)
assert close(fill, ROW_FILL[ui.appearance], 6), f'the row is still selected after returning: {fill}'
assert badge_pixels(ui, shot, items) < 40, 'the 消息 badge stayed after reading the only unread thread'

relaunch(ui, drop=[], add=['-uiVerifyFixture', 'one'], ready='home-scroll')
ui.tap('tab-messages')
items = ui.wait(lambda items: len(rows(items)) == 1 and items, 'the one fixture does not show a single row')
assert row_id(rows(items)[0]) == 'fixture-chat-bounty', rows(items)
ui.at_rest()
ui.capture('04-one')
print('PASS: rows newest first with title, side, last line and dot; push, deselect on return, read clears the badge')
