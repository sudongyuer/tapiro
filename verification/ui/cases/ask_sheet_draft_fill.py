"""A draft from 问小貘 fills the post form in place (132 A). The long, fully filled draft shows in the sheet; 填进表单
closes it and opens the form with every field filled, a strip 「小貘填了 5 项 · 撤销」 and the place 小貘 heard, which the
user picks on the map. The filled rows glow and fade out (a clip measures the title row: the glow colour, then frames
in between, then the plain row). 撤销 puts the blank form back and the strip goes; leaving the form and coming back
shows no strip and keeps the undone form. A second fill left in place survives leaving the form, without the strip."""
import sys
import tempfile
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from ask import TYPED, open_sheet, turn, type_and_send  # noqa: E402
from bounty import assert_category_one_line, close_sheet_by_swipe, value  # noqa: E402
from bounty import open_sheet as open_post_sheet  # noqa: E402
from driver import UI, Shot, by_id, close, reach_home, token  # noqa: E402
from recording import clip, frames  # noqa: E402

DEPS = ['src/features/ask/', 'src/features/shell/AskTapirSheet.tsx', 'src/app/ask.tsx', 'src/lib/drafts/',
        'src/features/bounty/post/', 'src/app/bounty-post/', 'src/lib/i18n/locales/ask/',
        'src/lib/i18n/locales/bounty/', 'verification/ui/ask.py', 'verification/ui/bounty.py',
        'verification/ui/recording.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 480
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyAiConsent', 'given',
        '-uiVerifyAiDelayMs', '800', '-uiVerifyAiReplies', 'draftFull', '-uiVerifyBountyDraft', 'none']
TITLE = '帮我去 Sunway Pyramid 取两个快递，送到 Sunway Geo 大堂，顺路买杯少冰奶茶'
ROW = {'light': (255, 255, 255), 'dark': (44, 44, 46)}

ui = UI(*sys.argv[1:])
reach_home(ui)
open_sheet(ui)
type_and_send(ui, TYPED)
turn(ui, 1)
ui.wait_label('ask-turn-1-title', lambda label: label == TITLE, 'the draft card lost its title')
ui.element('ask-turn-1-description')
ui.at_rest()
ui.capture('01-long-draft-card')

width = ui.read()[0]['frame']['width']
with clip(ui, 'glow') as video:
    ui.tap('ask-turn-1-fill')
    ui.element('bounty-post-form', timeout=20)
    time.sleep(3)
items = ui.read()
assert by_id(items, 'ask-tapir-sheet') is None, 'the sheet stayed open over the form'
filled = ui.t('bounty.post.aiFill.filled', count=5)
ui.wait_label('bounty-post-ai-filled', lambda label: label == filled, f'the strip is not {filled}')
place = ui.t('bounty.post.aiFill.place', place='Sunway Pyramid 北门快递柜')
ui.wait_label('bounty-post-ai-place', lambda label: label == place, 'the place 小貘 heard is not named')
assert value(ui, 'bounty-post-title') == TITLE, f'the title is {value(ui, "bounty-post-title")!r}'
assert value(ui, 'bounty-post-reward') == '15', f'the reward is {value(ui, "bounty-post-reward")!r}'
assert_category_one_line(ui, 'pickup')
undo = by_id(ui.read(), 'bounty-post-ai-undo')
assert undo and undo['frame']['height'] >= 44, f'撤销 is under 44 pt: {undo}'

title = by_id(ui.read(), 'bounty-post-title')['frame']
point = (title['x'] - 8, title['y'] + title['height'] / 2)
glow, row = token('--color-filled-glow', ui.appearance), ROW[ui.appearance]
with tempfile.TemporaryDirectory() as tmp:
    seen = [(Shot(path, width).rgb(*point), at) for path, at in frames(video, tmp, 0.03)]
lit = [at for rgb, at in seen if close(rgb, glow, 8)]
assert lit, f'the title row never glowed {glow}: {[rgb for rgb, _ in seen][-8:]}'
after = [(rgb, at) for rgb, at in seen if at > lit[-1]]
between = [rgb for rgb, _ in after if not close(rgb, row, 4)]
assert after and close(after[-1][0], row, 4), f'the glow did not end on the plain row {row}: {after[-3:]}'
assert between, 'the glow went out in one step, with no fade'
span = after[-1][1] - lit[0]
print(f'glow lit for {lit[-1] - lit[0]:.2f} s, faded over {len(between)} frames, plain after {span:.2f} s')
ui.at_rest()
ui.capture('02-filled-strip')

ui.tap('bounty-post-ai-undo')
ui.gone('bounty-post-ai-filled')
ui.wait(lambda items: value(ui, 'bounty-post-title') == '', '撤销 did not clear the title')
assert value(ui, 'bounty-post-reward') == '', f'撤销 left the reward {value(ui, "bounty-post-reward")!r}'
ui.at_rest()
ui.capture('03-undone')

close_sheet_by_swipe(ui)
if open_post_sheet(ui).get('AXUniqueId') == 'bounty-post-pick':
    ui.tap('bounty-post-pick-free')
ui.element('bounty-post-reward')
ui.wait(lambda items: by_id(items, 'bounty-post-title') is not None, 'the form never showed its title row')
assert value(ui, 'bounty-post-title') == '', 'the undone title came back'
assert by_id(ui.read(), 'bounty-post-ai-filled') is None, 'the strip came back after leaving the form'
ui.at_rest()
ui.capture('04-left-after-undo')
close_sheet_by_swipe(ui)

open_sheet(ui)
ui.tap('ask-resume')
turn(ui, 1)
ui.tap('ask-turn-1-fill')
ui.element('bounty-post-ai-filled', timeout=20)
close_sheet_by_swipe(ui)
open_post_sheet(ui)
ui.element('bounty-post-form')
ui.wait(lambda items: value(ui, 'bounty-post-title') == TITLE, 'leaving the form lost the filled title')
assert by_id(ui.read(), 'bounty-post-ai-filled') is None, 'the strip outlived the form'
ui.at_rest()
ui.capture('05-filled-kept')
print('PASS: long draft card, fill with strip, place hint and a fading glow, 撤销, strip gone after leaving')
