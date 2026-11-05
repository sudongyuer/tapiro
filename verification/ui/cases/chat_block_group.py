"""Block in a ride group (123 A, group rule): ⋯ holds 看详情, then 举报成员 and 屏蔽成员, each opening the other members by
name. 屏蔽成员 → Arif asks with the group effect (Arif stays in the ride, his messages fold); after 屏蔽, Arif's message reads
「已屏蔽的人发的消息 · 显示」 with no name above it, the composer stays (he is not removed and you can still post), and ⋯
offers 解除屏蔽 → Arif. 显示 opens that one message with his name."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, labels, menu_pick, open_menu, open_thread, sheet_action  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/features/block/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyBlockDelayMs', '1000']
TITLE = '双威 → KLIA2'
ARIF = 'fixture-chat-ride-m2'

ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-ride', TITLE)
ui.wait(lambda items: len(bubbles(items)) == 3, 'the ride thread never showed its messages')
ui.at_rest()

open_menu(ui, ui.t('chat.menu.reportMember'))
assert ui.t('chat.menu.blockMember') in labels(ui.read()), labels(ui.read())
ui.capture('01-menu')
menu_pick(ui, ui.t('chat.menu.reportMember'))
ui.labelled('Arif')
assert '美玲' in labels(ui.read()), f'举报成员 does not list every other member: {labels(ui.read())}'
ui.capture('02-report-members')
ui.tap_point(20, 400)
ui.at_rest()

open_menu(ui, ui.t('chat.menu.blockMember'))
menu_pick(ui, ui.t('chat.menu.blockMember'))
ui.labelled('Arif')
menu_pick(ui, 'Arif')
ui.labelled(ui.t('block.confirm.groupBody', name='Arif'))
sheet_action(ui, ui.t('block.confirm.confirm'))
folded = ui.element(f'chat-folded-{ARIF}', timeout=20)
assert folded.get('AXLabel') == ui.t('chat.thread.foldedA11y'), folded
items = ui.read()
assert by_id(items, f'chat-bubble-{ARIF}') is None, 'Arif’s message is still shown after blocking him'
assert 'Arif' not in labels([i for i in items if i['frame']['y'] < folded['frame']['y']
                              and i['frame']['y'] > folded['frame']['y'] - 30]), 'his name sits above the fold'
assert by_id(items, 'chat-composer-input'), 'the composer went away in the group'
assert folded['frame']['height'] >= 44, f'the fold is not a 44 pt target: {folded}'
ui.at_rest()
ui.snap('03-folded')

open_menu(ui, ui.t('chat.menu.unblockMember'))
ui.tap_point(20, 400)
ui.at_rest()

ui.tap(f'chat-folded-{ARIF}')
shown = ui.element(f'chat-bubble-{ARIF}', timeout=10)
assert shown.get('AXLabel') == ui.t('chat.list.from', name='Arif', body='OK, saya sampai 10 minit lagi'), shown
ui.gone(f'chat-folded-{ARIF}')
ui.at_rest()
ui.capture('04-shown')
print('PASS: group ⋯ lists members to report and block; blocking folds that member’s message, keeps the composer; '
      '显示 opens it')
