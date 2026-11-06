"""Refusals keep the field (`-uiVerifyCoins empty`, draft AAAAAA, `-uiVerifyCoinsFail redeem`): a network failure reads
「没填上，请检查网络后重试」 and is not sent again on its own; 好 again reads 「没有这个邀请码」 with AAAAAA still in the field;
changing the code clears the line, and my own code M8WQ4K reads 「这是你自己的邀请码」. When the first deal lands while the
page is open (`redeemTooLate`), the field goes away and 「完成第一单后就不能再填邀请码了」 stays on the page."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import paste_into, relaunch  # noqa: E402
from coins import coin_calls, label  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/account/MeView.tsx', 'src/app/(tabs)/me/', 'src/lib/i18n/locales/coins/', 'src/lib/loadable.ts', 'src/ui/SyncedTextField.tsx', 'src/ui/NoticeCard.tsx', 'src/debug/CoinsScenes.tsx', 'verification/ui/coins.py', 'verification/ui/bounty.py']
SCENE = 'invite-page'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'empty',
        '-uiVerifyInviteDraft', 'AAAAAA', '-uiVerifyCoinsFail', 'redeem']


def error_reads(key):
    ui.wait_label('invite-error', lambda text: text == ui.t(f'coins.invite.error.{key}'), f'the error never read {key}')
    field = by_id(ui.read(), 'invite-code-field')
    assert field is not None, 'the field went away after a refusal'
    return field.get('AXValue')


ui = UI(*sys.argv[1:])
ui.element('invite-code-field', timeout=45)
ui.tap('invite-submit')
assert error_reads('failed') == 'AAAAAA'
time.sleep(2)  # a replay would follow the failed answer
assert coin_calls(ui, 'redeem', 1, timeout=15), 'the first redeem never reached the call log'
sent = coin_calls(ui, 'redeem', 2, timeout=3)
assert len(sent) == 1, f'the failed redeem was sent again on its own: {sent}'
ui.at_rest()
ui.capture('01-failed')
ui.tap('invite-submit')
assert error_reads('notFound') == 'AAAAAA', 'the field was cleared after 没有这个邀请码'
ui.at_rest()
ui.capture('02-not-found')
paste_into(ui, 'invite-code-field', 'M8WQ4K')
ui.gone('invite-error', timeout=15)
ui.tap('invite-submit')
assert error_reads('ownCode') == 'M8WQ4K'
assert label(ui, 'invite-error') == ui.t('coins.invite.error.ownCode')
assert [call['typed'] for call in coin_calls(ui, 'redeem', 3)] == ['AAAAAA', 'AAAAAA', 'M8WQ4K']
ui.at_rest()
ui.capture('03-own-code')
relaunch(ui, drop=['-uiVerifyInviteDraft', 'AAAAAA', '-uiVerifyCoinsFail', 'redeem'],
         add=['-uiVerifyInviteDraft', '7KQ3XP', '-uiVerifyCoinsFail', 'redeemTooLate', '-uiVerifyScene', SCENE],
         ready='invite-code-field')
ui.tap('invite-submit')
ui.element('invite-refused', timeout=30)
ui.gone('invite-code-field', timeout=30)
time.sleep(2)  # the reload after the refusal lands; the line must outlive it
assert ui.t('coins.invite.error.tooLate') in label(ui, 'invite-refused'), label(ui, 'invite-refused')
ui.at_rest()
ui.capture('04-too-late')
print('PASS: refusals keep the typed code, say why and never resend on their own')
