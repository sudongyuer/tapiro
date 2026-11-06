"""A failed first load (`-uiVerifyCoinsFail invite`) reads 「没加载出来」 with 重试 and shows no code, no buttons and no
field; 重试 loads the page. A failed pull to refresh (`inviteAgain`) keeps the page with 「没刷新成功 · 下面是上次加载的邀请」
and 重试, which brings it back to current."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from coins import label  # noqa: E402
from driver import UI, by_id  # noqa: E402
from gestures import pull  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/account/MeView.tsx', 'src/app/(tabs)/me/', 'src/lib/i18n/locales/coins/', 'src/lib/loadable.ts', 'src/ui/SyncedTextField.tsx', 'src/ui/NoticeCard.tsx', 'src/debug/CoinsScenes.tsx', 'verification/ui/coins.py', 'verification/ui/bounty.py', 'verification/ui/gestures.py']
SCENE = 'invite-page'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoinsFail', 'invite']

ui = UI(*sys.argv[1:])
ui.element('invite-failed', timeout=45)
items = ui.read()
assert ui.t('coins.failed') in label(ui, 'invite-failed')
for missing in ('invite-code', 'invite-copy', 'invite-share', 'invite-code-field', 'invite-friend-0'):
    assert by_id(items, missing) is None, f'{missing} shows on a failed load'
ui.at_rest()
ui.capture('01-failed')
ui.tap('invite-retry')
ui.element('invite-code', timeout=30)
assert by_id(ui.read(), 'invite-failed') is None
ui.at_rest()
ui.capture('02-retried')

relaunch(ui, drop=['-uiVerifyCoinsFail', 'invite'], add=['-uiVerifyCoinsFail', 'inviteAgain', '-uiVerifyScene', SCENE],
         ready='invite-code')
pull(ui, ui.read())
ui.element('invite-stale', timeout=30)
assert ui.t('coins.invite.stale') in label(ui, 'invite-stale')
assert by_id(ui.read(), 'invite-code') is not None, 'a failed refresh dropped the shown code'
ui.at_rest()
ui.capture('03-stale')
ui.tap('invite-stale-retry')
ui.gone('invite-stale', timeout=30)
ui.capture('04-current')
print('PASS: a failed load shows no code, a failed refresh is marked stale, 重试 recovers')
