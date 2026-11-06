"""Worst data (`-uiVerifyCoins worst`): before the first deal, with a 41-character invited name; in ms the code, both
buttons, the reward line, the field with its placeholder and 好, and the invited rows all stay inside the screen, and the
long name is cut on one line while VoiceOver reads it whole."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from coins import label  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402
from profile import scroll_to, within_width  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/account/MeView.tsx', 'src/app/(tabs)/me/', 'src/lib/i18n/locales/coins/', 'src/lib/loadable.ts', 'src/ui/SyncedTextField.tsx', 'src/ui/NoticeCard.tsx', 'src/debug/CoinsScenes.tsx', 'verification/ui/coins.py', 'verification/ui/bounty.py', 'verification/ui/profile.py']
SCENE = 'invite-page'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCoins', 'worst']
LONG = 'Siti Nurhaliza binti Ahmad Zulkifli Rahman'

ui = UI(*sys.argv[1:])
ui.element('invite-code', timeout=45)
field = ui.element('invite-code-field', timeout=30)
items = ui.read()
for identifier in ('invite-code', 'invite-copy', 'invite-share', 'invite-explain', 'invite-code-field', 'invite-submit'):
    within_width(items, identifier)
assert_touch_target(by_id(items, 'invite-submit'), '好')
copy, share = by_id(items, 'invite-copy')['frame'], by_id(items, 'invite-share')['frame']
assert copy['x'] + copy['width'] <= share['x'], 'the buttons overlap'
ui.at_rest()
ui.capture('01-top')
row = scroll_to(ui, 'invite-friend-1')
items = ui.read()
within_width(items, 'invite-friend-1')
assert label(ui, 'invite-friend-1') == LONG + ui.t('coins.listJoin') + ui.t('coins.invite.waiting'), label(ui, 'invite-friend-1')
assert row['frame']['height'] <= by_id(items, 'invite-friend-0')['frame']['height'] + 1, 'the long name wraps'
ui.at_rest()
ui.capture('02-invited')
print('PASS: the worst invite page fits in every part')
