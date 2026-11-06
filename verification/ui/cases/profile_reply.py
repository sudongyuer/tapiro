"""Replying on your own profile (243 A): 回复 under a review opens 回复评价 with the review quoted; typing counts characters
(6/200) and 发送 asks 「回复发出后不能修改」 with 再想想 and 发出; a failed send (`-uiVerifyRepFail reply`) keeps the sheet, the
text and 没回复成功 and sends nothing again on its own; 发出 again closes the sheet, the review reads 我的回复：thanks and its
回复 is gone, so a reply is final."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from gestures import drag  # noqa: E402
from profile import (label, open_profile, rep_calls, review_id,  # noqa: E402
                     tap_button)

DEPS = ['src/features/reputation/', 'src/app/(tabs)/', 'src/ui/TierMark.tsx', 'src/ui/Avatar.tsx', 'src/ui/NoticeCard.tsx', 'src/ui/Mascot.tsx', 'src/lib/report.ts', 'src/lib/i18n/locales/reputation/', 'src/features/block/', 'src/debug/ReputationScenes.tsx', 'verification/ui/profile.py']
SCENE = 'profile'
BUDGET = 300
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson', '00000000-0000-4000-8000-000000000001', '-uiVerifyProfileTab', 'me', '-uiVerifyRepFail', 'reply']
TEXT = 'thanks'
REVIEW = 'fixture-profile-review-001'

ui = UI(*sys.argv[1:])
open_profile(ui)
items = ui.read()
w, h = items[0]['frame']['width'], items[0]['frame']['height']
for _ in range(4):
    if by_id(ui.read(), f'{review_id(1)}-reply-button'):
        break
    drag(ui, (w / 2, h * 0.75), (w / 2, h * 0.35))
ui.tap(f'{review_id(1)}-reply-button')
ui.element('profile-reply', timeout=30)
quote = label(ui, 'profile-reply-quote')
assert quote.startswith(ui.t('reputation.face.happy')), quote
ui.tap('profile-reply-input')
ui.type(TEXT)
ui.wait_label('profile-reply-count', lambda text: text == ui.t('reputation.reply.countLabel', count=6, max=200),
              'the count does not read 6 of 200')
ui.at_rest()
ui.capture('01-typed')


def send():
    tap_button(ui, ui.t('reputation.reply.send'))
    ui.labelled(ui.t('reputation.reply.confirm'))
    ui.labelled(ui.t('reputation.reply.confirmCancel'))
    tap_button(ui, ui.t('reputation.reply.confirmSend'))


send()
ui.element('profile-reply-failed', timeout=30)
assert ui.t('reputation.reply.failed') in label(ui, 'profile-reply-failed')
assert (by_id(ui.read(), 'profile-reply-input').get('AXValue') or '') == TEXT, 'the typed reply was lost'
time.sleep(2)  # a replay would follow the failed answer
assert len(rep_calls(ui, 'reply', 2, timeout=2)) == 1, 'the failed reply was sent again on its own'
ui.at_rest()
ui.capture('02-failed')

send()
ui.gone('profile-reply', timeout=30)
calls = rep_calls(ui, 'reply', 2)
assert calls == [{'reviewId': REVIEW, 'body': TEXT}] * 2, calls
reply = ui.element(f'{review_id(1)}-reply', timeout=20)
assert reply.get('AXLabel') == f"{ui.t('reputation.reply.mine')}{TEXT}", reply.get('AXLabel')
assert by_id(ui.read(), f'{review_id(1)}-reply-button') is None, '回复 is still offered after replying'
ui.at_rest()
ui.capture('03-replied')
print('PASS: a reply is confirmed once, survives a failure without a replay, and is final once sent')
