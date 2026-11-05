"""The blocked side (123 A): 阿杰 blocked you (`-uiVerifyChatBlockedBy 1`), which the thread never says; the composer stays
and a send fails as 被拒: the bubble keeps its text with a red ! and 「消息发不出去」 under it, nothing is sent again on its
own, and tapping ! offers only 删除 and 取消 (「这条消息发不出去」), since resending cannot succeed."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from chat import bubbles, chat_calls, labels, open_thread, tap_button  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/chat/', 'src/app/(tabs)/messages/', 'verification/ui/chat.py']
DRAFT = '你下来了吗'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyChat', '1',
        '-uiVerifyChatBlockedBy', '1', '-uiVerifyChatDraft', 'fixture-chat-bounty|你下来了吗']


def refused(items):
    return [i for i in items if (i.get('AXUniqueId') or '').startswith('chat-refused-')]


ui = UI(*sys.argv[1:])
open_thread(ui, 'fixture-chat-bounty', '阿杰')
ui.wait(lambda items: (by_id(items, 'chat-composer-input') or {}).get('AXValue') == DRAFT, 'no kept draft')
items = ui.read()
assert by_id(items, 'chat-thread-blocked') is None, 'the blocked side is told about the block'
ui.tap('chat-composer-send')
items = ui.wait(lambda items: refused(items) and items, 'the refused bubble shows no 消息发不出去')
[caption] = refused(items)
assert caption.get('AXLabel') == ui.t('chat.thread.refused'), caption
retry = next(i for i in items if (i.get('AXUniqueId') or '').startswith('chat-retry-'))
assert retry.get('AXLabel') == ui.t('chat.thread.undeliverable'), retry
mine = next(b for b in bubbles(items) if b.get('AXLabel') == ui.t('chat.thread.a11yFailed',
                                                                    label=ui.t('chat.list.mine', body=DRAFT)))
assert caption['frame']['y'] >= mine['frame']['y'] + mine['frame']['height'] - 1, 'the caption is not under the bubble'
assert by_id(items, 'chat-composer-input'), 'the composer went away on the blocked side'
assert not any('屏蔽' in str(label) or 'block' in str(label).lower() for label in labels(items)), \
    f'the blocked side reads a block: {labels(items)}'
ui.at_rest()
ui.snap("01-refused")
time.sleep(2)  # a replay would follow the refused answer
assert len(chat_calls(ui, 'send', 2, 0)) == 1, 'a refused message was sent again on its own'

ui.tap(retry['AXUniqueId'])
ui.labelled(ui.t('chat.thread.undeliverableTitle'))
items = ui.read()
assert ui.t('chat.thread.resend') not in labels(items), 'a refused message offers 重发'
ui.capture('02-undeliverable')
tap_button(ui, ui.t('chat.thread.discard'))
ui.wait(lambda items: not refused(items), 'the refused message stayed after 删除')
print('PASS: the blocked side keeps the composer, a send shows 消息发不出去 with only 删除, no replay, no block wording')
