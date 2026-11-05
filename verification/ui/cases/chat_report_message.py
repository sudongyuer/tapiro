"""Report a message (122 A): long-press 阿杰's message → 举报 opens the 举报 sheet with the message quoted, the four reasons
and an optional note; 提交 stays off until a reason is picked. 提交 sends the report for that message with the reason and
the note, then the system action sheet asks 「收到了，我们会看。也屏蔽阿杰？」 with the effect of blocking; 屏蔽 blocks him
(progress in place of ⋯), the sheet closes and the composer is replaced by 「你屏蔽了阿杰」 with 解除, the history kept.
Dark covers the sheet over the thread."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import paste_into  # noqa: E402
from chat import bubbles, chat_calls, labels, open_thread, sheet_action  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/features/block/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
LOCALES = ['zh-Hans', 'en']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyBlockDelayMs', '1500']
PEER = 'chat-bubble-fixture-chat-bounty-m3'
NAME = '阿杰'
NOTE = '他让我先转 RM20 定金'


def submit(items):
    return next((i for i in items if i.get('AXLabel') == ui.t('chat.report.submit') and i.get('type') == 'Button'),
                None)


ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', NAME)
ui.wait(lambda items: len(bubbles(items)) == 3, 'the demo thread never showed its messages')
ui.at_rest()

ui.press(PEER, 1.2)
ui.labelled(ui.t('chat.thread.copy'))
ui.tap_label(ui.t('chat.thread.report'))
ui.element('chat-report', timeout=20)
quote = ui.element('chat-report-quote')
assert quote.get('AXLabel') == '好的，放好了，拍了照片给你', quote
items = ui.read()
for reason in ('harassment', 'off_platform_payment', 'inappropriate', 'other'):
    assert ui.t(f'chat.report.reason.{reason}') in labels(items), f'no reason {reason}: {labels(items)}'
assert ui.t('chat.report.reasons', name=NAME) in ' '.join(str(label) for label in labels(items)), labels(items)
assert submit(items) and submit(items).get('enabled') is False, f'提交 is live before a reason: {submit(items)}'
ui.at_rest()
ui.capture('01-sheet')

ui.tap_label(ui.t('chat.report.reason.off_platform_payment'))
ui.wait(lambda items: (submit(items) or {}).get('enabled') is True, '提交 stays off after a reason was picked')
paste_into(ui, 'chat-report-note', NOTE)
ui.at_rest()
ui.capture('02-filled')

f = submit(ui.read())['frame']
ui.tap_point(f['x'] + f['width'] / 2, f['y'] + f['height'] / 2)
ui.labelled(ui.t('chat.report.offerBlock', name=NAME))
assert chat_calls(ui, 'report', 1) == [{'userId': 'fixture-chat-jie', 'messageId': 'fixture-chat-bounty-m3',
                                        'reason': 'off_platform_payment', 'note': NOTE}], chat_calls(ui, 'report', 1)
ui.labelled(ui.t('block.confirm.threadBody', name=NAME))
ui.capture('03-offer-block')
sheet_action(ui, ui.t('block.confirm.confirm'))
ui.gone('chat-report', timeout=20)
footer = ui.element('chat-thread-blocked', timeout=20)
assert footer.get('AXLabel') == ui.t('chat.blocked.footer', name=NAME), footer
items = ui.read()
assert by_id(items, 'chat-composer-input') is None, 'the composer is still there after blocking'
assert len(bubbles(items)) == 3, 'the history did not stay after blocking'
unblock = by_id(items, 'chat-thread-unblock')
assert unblock and unblock['frame']['height'] >= 44, f'解除 is not a 44 pt target: {unblock}'
ui.at_rest()
ui.capture('04-blocked')
print('PASS: report sheet with quote, reasons and note; report sent with reason and note; offered block replaces the '
      'composer with the blocked footer and keeps the history')
