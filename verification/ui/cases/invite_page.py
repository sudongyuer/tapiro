"""255 A: 我的 → 邀请朋友 (right under 貘币) pushes the invite page: my code M8WQ4K large (VoiceOver spells it), 复制 and
分享 as two equal pills whose labels read against their fill (pixels, light and dark), with the reward line under them; 复制 puts the code on the pasteboard and reads 已复制; 分享 hands the
board's text with my code to the system share sheet; past the first deal there is no code field; the people I invited
read 已完成第一单 · +3 or 还没完成; back returns to 我的 with the row deselected."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import copy_on_device, device_pasteboard  # noqa: E402
from coins import coin_calls, label  # noqa: E402
from driver import UI, assert_touch_target, by_id, close, dominant, luma, reach_home  # noqa: E402

DEPS = ['src/features/coins/', 'src/features/account/MeView.tsx', 'src/app/(tabs)/me/', 'src/lib/i18n/locales/coins/', 'src/lib/loadable.ts', 'src/ui/SyncedTextField.tsx', 'src/ui/NoticeCard.tsx', 'src/debug/CoinsScenes.tsx', 'verification/ui/coins.py', 'verification/ui/bounty.py']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyCopiedMs', '8000']
CODE = 'M8WQ4K'
CELL = {'light': (255, 255, 255), 'dark': (28, 28, 30)}

ui = UI(*sys.argv[1:])
reach_home(ui)
ui.tap('tab-me')
row = ui.element('me-invite', timeout=30)
items = ui.read()
assert row.get('AXLabel') == ui.t('coins.invite.row'), row.get('AXLabel')
assert_touch_target(row, '邀请朋友那行')
coins = by_id(items, 'me-coins')['frame']
assert 0 < row['frame']['y'] - coins['y'] <= coins['height'] + 1, '邀请朋友 is not right under 貘币'
ui.tap('me-invite')
ui.element('invite-screen', timeout=30)
code = ui.element('invite-code', timeout=30)
assert code.get('AXLabel') == ui.t('coins.invite.codeA11y', code=' '.join(CODE)), code.get('AXLabel')
items = ui.read()
copy, share = by_id(items, 'invite-copy'), by_id(items, 'invite-share')
assert copy.get('AXLabel') == ui.t('coins.invite.copy') and share.get('AXLabel') == ui.t('coins.invite.share')
assert_touch_target(copy, '复制')
assert_touch_target(share, '分享')
assert abs(copy['frame']['y'] - share['frame']['y']) < 2 and copy['frame']['x'] < share['frame']['x'], 'buttons are not side by side'
assert abs(copy['frame']['width'] - share['frame']['width']) < 2, f'the two pills differ in width: {copy["frame"]} {share["frame"]}'
assert label(ui, 'invite-explain') == ui.t('coins.invite.explain', reward=3), label(ui, 'invite-explain')
assert by_id(items, 'invite-code-field') is None, 'the code field shows after the first deal'
assert label(ui, 'invite-friend-0') == '阿明' + ui.t('coins.listJoin') + ui.t('coins.invite.rewarded', reward=3)
siti = label(ui, 'invite-friend-1')
assert siti.endswith(ui.t('coins.listJoin') + ui.t('coins.invite.waiting')), siti
ui.at_rest()
shot = ui.snap('01-page')
for name, button in (('复制', copy), ('分享', share)):
    fill = luma(dominant(shot, button['frame']))
    ink = shot.count(button['frame'], lambda rgb: abs(luma(rgb) - fill) >= 90)
    assert ink >= 200, f'{name} has no readable label on its pill in {ui.appearance}: {ink} contrasting pixels'

copy_on_device(ui, 'sentinel')
assert device_pasteboard(ui) == 'sentinel', 'the pasteboard could not be reset'
ui.tap('invite-copy')
ui.wait_label('invite-copy', lambda text: text == ui.t('coins.invite.copied'), '复制 never read 已复制')
assert device_pasteboard(ui) == CODE, f'the pasteboard holds {device_pasteboard(ui)!r}'
ui.capture('02-copied')
ui.tap('invite-share')
shared = coin_calls(ui, 'share', 1, timeout=10)
assert [call['message'] for call in shared] == [ui.t('coins.invite.shareText', code=CODE, reward=3)], shared
ui.tap('BackButton')
ui.gone('invite-screen')
ui.element('me-invite')
ui.at_rest()
shot = ui.snap('03-back')
f = by_id(ui.read(), 'me-invite')['frame']
fill = shot.rgb(f['x'] + f['width'] * 0.5, f['y'] + f['height'] / 2)
assert close(fill, CELL[ui.appearance], 8), f'the 邀请朋友 row stays highlighted: {fill}'
print('PASS: the invite page shows my code, copies it and shares the board text')
