"""Block from the thread ⋯ (127 A, 123 A): ⋯ (更多) holds 看详情, then 举报阿杰 and a red 屏蔽阿杰 in their own group. 屏蔽阿杰
opens the system action sheet that says neither side can send here and the history stays; 屏蔽 shows progress in place
of ⋯. The first block fails (`-uiVerifyBlock failOnce`): 没屏蔽成功 and the composer stays. The second replaces the
composer with 「你屏蔽了阿杰 · 解除」, keeps the messages, and ⋯ now offers 解除屏蔽阿杰. 解除 asks first; the first unblock
fails with 没解除成功 under the footer, the second brings the composer back. Dark covers the footer over the transcript."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, labels, menu_pick, open_menu, open_thread, sheet_action  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/features/block/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyBlock', 'failOnce', '-uiVerifyBlockDelayMs', '1500']
NAME = '阿杰'


def block_once():
    open_menu(ui, ui.t('chat.menu.block', name=NAME))
    menu_pick(ui, ui.t('chat.menu.block', name=NAME))
    ui.labelled(ui.t('block.confirm.title', name=NAME))
    ui.labelled(ui.t('block.confirm.threadBody', name=NAME))
    sheet_action(ui, ui.t('block.confirm.confirm'))
    busy = ui.element('chat-thread-menu-busy', timeout=5)
    assert busy.get('AXLabel') == ui.t('chat.menu.busy'), busy


def unblock_once():
    ui.tap('chat-thread-unblock')
    ui.labelled(ui.t('block.unblock.title', name=NAME))
    sheet_action(ui, ui.t('block.unblock.confirm'))


ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', NAME)
ui.wait(lambda items: len(bubbles(items)) == 3, 'the demo thread never showed its messages')
ui.element('chat-composer-input')
ui.at_rest()

open_menu(ui, ui.t('chat.menu.detail'))
items = ui.read()
order = [ui.t('chat.menu.detail'), ui.t('chat.menu.report', name=NAME), ui.t('chat.menu.block', name=NAME)]
found = [next((i for i in reversed(items) if i.get('AXLabel') == label), None) for label in order]
assert all(found), f'the ⋯ menu misses an item: {labels(items)}'
ys = [i['frame']['y'] for i in found]
assert ys == sorted(ys), f'the ⋯ menu is not 看详情, 举报, 屏蔽: {ys}'
ui.capture('01-menu')
ui.tap_point(20, 400)
ui.at_rest()

block_once()
ui.element('chat-thread-block-failed', timeout=20)
assert by_id(ui.read(), 'chat-composer-input'), 'the composer went away after a failed block'
ui.capture('02-block-failed')

block_once()
footer = ui.element('chat-thread-blocked', timeout=20)
assert footer.get('AXLabel') == ui.t('chat.blocked.footer', name=NAME), footer
items = ui.read()
assert by_id(items, 'chat-composer-input') is None, 'the composer stayed after blocking'
assert by_id(items, 'chat-thread-block-failed') is None, '没屏蔽成功 stayed after the block went through'
assert len(bubbles(items)) == 3, 'the history did not stay'
list_bottom = max(b['frame']['y'] + b['frame']['height'] for b in bubbles(items))
assert list_bottom <= footer['frame']['y'] + 1, 'the newest message is under the blocked footer'
ui.at_rest()
ui.snap('03-blocked')
open_menu(ui, ui.t('chat.menu.unblock', name=NAME))
assert ui.t('chat.menu.block', name=NAME) not in labels(ui.read()), '⋯ still offers 屏蔽 after blocking'
ui.capture('04-menu-blocked')
ui.tap_point(20, 400)
ui.at_rest()

unblock_once()
ui.element('chat-thread-unblock-failed', timeout=20)
assert by_id(ui.read(), 'chat-thread-blocked'), 'the footer went away after a failed unblock'
ui.capture('05-unblock-failed')
unblock_once()
ui.element('chat-composer-input', timeout=20)
ui.gone('chat-thread-blocked')
ui.at_rest()
ui.capture('06-unblocked')
print('PASS: ⋯ menu order; block failure kept the composer; block replaced it with the footer and kept the history; '
      'unblock failure shown; unblock brought the composer back')
