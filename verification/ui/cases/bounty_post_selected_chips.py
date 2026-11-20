"""The chips picked in the post form read against their fill: with 取快递 open, a tapped amount and a tapped quick time
fill with the accent and carry the on-accent label (WCAG 4.5:1, pixels, light and dark). The three quick times are one
height (161A) and sit 12 pt from the hairlines around them, and the title field starts where the system 截止 row does.
VoiceOver reads each quick time as 「截止时间：<time>」, and each draws its whole name (ms 「Sebelum tengah hari esok」 was
cut to 「Sebelum tengah h…」, audit L1).
Reached without typing, since
AXe key events drop on iOS 27.2."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import form_scroll_to, open_post, value  # noqa: E402
from driver import UI, by_id, token  # noqa: E402
from post_layout import assert_chip_room, assert_row_edges  # noqa: E402
from readable import assert_label_reads  # noqa: E402
from whole import assert_drawn_whole  # noqa: E402

DEPS = ['src/features/bounty/post/', 'src/app/bounty-post/', 'src/ui/FieldRow.tsx', 'verification/ui/bounty.py',
        'verification/ui/post_layout.py', 'verification/ui/readable.py', 'verification/ui/whole.py',
        'modules/tapiro-kit/ios/ChipRowView.swift']
LOCALES = ['zh-Hans', 'en', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'none']
BUDGET = 180
# 今晚 (21:00) is hidden once it has passed, so a run after 21:00 found two quick times (2026-11-17).
LOCAL_HOURS = [14, 15]

ui = UI(*sys.argv[1:])
accent = token('--color-accent', ui.appearance)
open_post(ui, 'pickup')
form_scroll_to(ui, 'bounty-post-amount-8')
ui.tap('bounty-post-amount-8')
ui.wait(lambda items: value(ui, 'bounty-post-reward') == '8', 'the RM 8 button did not fill the reward')
ui.at_rest()
items = ui.read()
assert_label_reads(ui.snap('01-amount-selected'), by_id(items, 'bounty-post-amount-8')['frame'], 'selected RM 8',
                   accent)

form_scroll_to(ui, 'bounty-post-add-time')
ui.tap('bounty-post-add-time')
pick = ui.wait(lambda items: next((i for i in items if str(i.get('AXUniqueId')).startswith('bounty-post-pick-time-')), None),
               'no quick time shows')['AXUniqueId']
form_scroll_to(ui, pick)
ui.tap(pick)
ui.at_rest()
items = ui.read()
assert_label_reads(ui.snap('02-time-selected'), by_id(items, pick)['frame'], f'selected {pick}', accent)
picks = [i['AXUniqueId'] for i in items if str(i.get('AXUniqueId')).startswith('bounty-post-pick-time-')]
assert len(picks) == 3, f'expected three quick times, found {picks}'
for identifier in picks:
    name = ui.t(f"bounty.post.timePick.{identifier.removeprefix('bounty-post-pick-time-')}")
    spoken = by_id(items, identifier).get('AXLabel')
    assert spoken == ui.t('bounty.post.timePick.label', name=name), f'{identifier} reads {spoken!r}'
assert_chip_room(items, picks, 12, 'the quick times')
shot = ui.snap('03-time-names')
read = None
for identifier in picks:
    name = ui.t(f"bounty.post.timePick.{identifier.removeprefix('bounty-post-pick-time-')}")
    read = assert_drawn_whole(ui, shot, by_id(items, identifier)['frame'], name, identifier, read)
assert_row_edges(ui, items, [], least=2)
print('PASS: a picked amount and quick time read against the accent fill; the quick times are one height, clear of the hairlines')
