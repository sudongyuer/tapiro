"""发消息 on the home in-progress card (126 A). The 讲一下微积分作业 card, with Aiman on the way, shows a 发消息 pill at the
bottom; tapping it opens the bounty's thread in 消息 rather than the status screen, and the card still reads as one
VoiceOver button with its title, step and reward. A card still waiting for applicants (帮取快递, 去选人) has no thread
and no 发消息."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402
from ocr import find, lines  # noqa: E402

DEPS = ['src/features/home/', 'src/features/chat/', 'src/features/bounty/live/', 'src/lib/liveItems.ts',
        'src/app/(tabs)/bounty/index.tsx', 'src/app/(tabs)/messages/', 'verification/ui/bounty.py',
        'verification/ui/ocr.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
FIRST = ['-uiVerifyShellFeed', 'bountyAction']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyChat', '1', '-uiVerifyShellFeed', 'bountyAction']

ui = UI(*sys.argv[1:])
word = ui.t('home.card.bounty.message')

reach_home(ui)
front = ui.settled(lambda items: by_id(items, 'live-card-bountyAction'), 'the 要你处理 card is not in front')
ui.at_rest()
shot = ui.snap('01-choose-no-entry')
assert not find(lines(shot), word, front['frame']), f'a bounty still open for applicants shows {word}'

relaunch(ui, drop=FIRST, add=['-uiVerifyShellFeed', 'bountyInProgress'])
front = ui.settled(lambda items: by_id(items, 'live-card-bountyInProgress'), 'the in-progress card is not in front')
assert front.get('AXLabel') == ui.t('home.card.bounty.label', title='讲一下微积分作业', line='Aiman在路上 · 20:00 到',
                                    reward='RM 20'), front.get('AXLabel')
ui.at_rest()
shot = ui.snap('02-in-progress')
pills = find(lines(shot), word, front['frame'])
assert len(pills) == 1, f'expected one {word} on the card, OCR read {pills}'
pill = pills[0]
assert pill['y'] > front['frame']['y'] + front['frame']['height'] / 2, f'{word} is not at the bottom of the card: {pill}'

ui.tap_point(pill['x'] + pill['width'] / 2, pill['y'] + pill['height'] / 2)
ui.element('chat-safety', timeout=45)
ui.wait(lambda items: str((by_id(items, 'tab-messages') or {}).get('AXValue')) == '1', '消息 is not selected')
assert by_id(ui.read(), 'bounty-status') is None, 'the status screen opened instead of the thread'
ui.at_rest()
ui.capture('03-thread')
print('PASS: 发消息 only on a card with a chosen helper, opens the thread in 消息')
