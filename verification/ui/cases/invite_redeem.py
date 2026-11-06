"""Before the first deal (`-uiVerifyCoins empty`) the page offers 填朋友的码 with the stored draft 7KQ3XP
(`-uiVerifyInviteDraft`); 好 shows progress while the call is out (`-uiVerifyCoinsDelayMs 3000`), sends exactly one redeem
with what was typed, then the field goes away and 我填的邀请码 reads Mei's code with 还没完成."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import coin_calls, label  # noqa: E402
from driver import UI, by_id  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/account/MeView.tsx', 'src/app/(tabs)/me/', 'src/lib/i18n/locales/coins/', 'src/lib/loadable.ts', 'src/ui/SyncedTextField.tsx', 'src/ui/NoticeCard.tsx', 'src/debug/CoinsScenes.tsx', 'verification/ui/coins.py', 'verification/ui/bounty.py']
SCENE = 'invite-page'
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'empty',
        '-uiVerifyInviteDraft', '7KQ3XP', '-uiVerifyCoinsDelayMs', '3000']

ui = UI(*sys.argv[1:])
field = ui.element('invite-code-field', timeout=45)
assert field.get('AXValue') == '7KQ3XP', f'the stored draft is not in the field: {field.get("AXValue")!r}'
assert by_id(ui.read(), 'invite-friend-0') is None, 'an account with no invites lists people'
ui.at_rest()
ui.capture('01-field')
ui.tap('invite-submit')
ui.element('invite-sending', timeout=10)
ui.capture('02-sending')
ui.element('invite-redeemed', timeout=30)
items = ui.read()
assert by_id(items, 'invite-code-field') is None, 'the field stays after the code was taken'
status = ui.t('coins.invite.redeemedStatus', code='7KQ3XP', status=ui.t('coins.invite.waiting'))
expected = ui.t('coins.invite.redeemedRow', name='Mei') + ui.t('coins.listJoin') + status
assert label(ui, 'invite-redeemed') == expected, label(ui, 'invite-redeemed')
calls = coin_calls(ui, 'redeem', 2, timeout=3)
assert calls == [{'typed': '7KQ3XP'}], f'redeem calls: {calls}'
ui.at_rest()
ui.capture('03-redeemed')
print('PASS: a typed code is redeemed once and the page shows whose code it was')
