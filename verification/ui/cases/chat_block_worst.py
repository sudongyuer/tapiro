"""Worst case for report and block: a 56-character name. ⋯ → 举报 that person (no message) opens the 举报 sheet with the name
in the reasons header and no quote; the longest reason (ms) wraps inside its row. After blocking, the footer wraps the
name and keeps 解除 a 44 pt target on screen."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, menu_pick, open_menu, open_thread, sheet_action, within_screen  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/features/block/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyFixture', 'worst', '-uiVerifyBlockDelayMs', '800']
NAME = 'Nurul Aisyah binti Mohd Rahman Abdullah Hj. Kamaruddin'

ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-worst', NAME)
ui.wait(lambda items: len(bubbles(items)) == 2, 'the worst thread never showed its messages')
ui.at_rest()

open_menu(ui, ui.t('chat.menu.report', name=NAME))
ui.capture('01-menu')
menu_pick(ui, ui.t('chat.menu.report', name=NAME))
ui.element('chat-report', timeout=20)
items = ui.read()
assert by_id(items, 'chat-report-quote') is None, 'a person report quotes a message'
longest = next(i for i in items if i.get('AXLabel') == ui.t('chat.report.reason.off_platform_payment'))
within_screen(items, longest)
ui.at_rest()
ui.capture('02-sheet')
ui.tap_label(ui.t('chat.report.cancel'))
ui.gone('chat-report', timeout=20)
ui.at_rest()

open_menu(ui, ui.t('chat.menu.block', name=NAME))
menu_pick(ui, ui.t('chat.menu.block', name=NAME))
sheet_action(ui, ui.t('block.confirm.confirm'))
footer = ui.element('chat-thread-blocked', timeout=20)
items = ui.read()
unblock = by_id(items, 'chat-thread-unblock')
within_screen(items, footer)
within_screen(items, unblock)
assert unblock['frame']['height'] >= 44 and unblock['frame']['width'] >= 44, f'解除 is under 44 pt: {unblock}'
ui.at_rest()
ui.capture('03-blocked')
print('PASS: long name in the menu, sheet and footer; reasons wrap; 解除 stays a 44 pt target')
