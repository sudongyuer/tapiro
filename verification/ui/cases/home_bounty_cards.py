"""With four bounty cards (帮取快递 needs a choice, 讲一下微积分作业 in progress, 搬桌子 waiting for applicants and the one-time 这次没选上),
home puts 要你处理 in front with its step and 去选人 pill, names the card for VoiceOver with title, step and reward, puts the
front card's title and step on the stage, peeks the next two with their title and step, and fans out to four cards with the
waiting cards in the calm colour; the one-time card is marked seen once, not again when fanned out a second time; tapping
the front card opens the 挑人 screen for 帮取快递."""
import json
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from choose import defaults  # noqa: E402
from driver import UI, assert_colour, by_id, card_fill, reach_home, token  # noqa: E402

DEPS = ['src/features/home/', 'src/features/shell/', 'src/app/(tabs)/bounty/', 'verification/ui/choose.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyShellFeed', 'bountyAction,bountyInProgress,bountyWaiting,bountyOneTime',
        '-uiVerifySignedIn', 'onboarded']
SEEN_KEY = 'uiVerifyHomeSeen'
CARDS = ['bountyAction', 'bountyInProgress', 'waitingConfirm']

ui = UI(*sys.argv[1:])


def seen():
    text = defaults(ui, SEEN_KEY)
    return json.loads(text) if text else []


def wait_seen(expected):
    ui.wait(lambda items: seen() == expected or None, f'seen marks are {seen()}, not {expected}', timeout=30)


reach_home(ui)
stage = ui.settled(lambda items: by_id(items, 'home-stage-live'), 'the live stage never settled')
assert stage.get('AXLabel') == ui.t('home.say.bounty', title='帮取快递', line='3 人申请，去选'), stage.get('AXLabel')

front = ui.settled(lambda items: by_id(items, 'live-card-bountyAction'), 'the 要你处理 card is not in front')
reward = 'RM\u00a08'
assert front.get('AXLabel') == ui.t('home.card.bounty.label', title='帮取快递', line='3 人申请，去选', reward=reward), \
    front.get('AXLabel')
assert front['frame']['height'] >= 44, front['frame']

items = ui.read()
peek = by_id(items, 'live-card-peek-1')
assert peek and peek.get('AXLabel') == ui.t('home.card.bounty.line', title='讲一下微积分作业', line='Aiman在路上 · 20:00 到'), \
    peek and peek.get('AXLabel')
assert by_id(items, 'live-card-peek-2'), 'the third card does not peek'
toggle = by_id(items, 'live-cards-toggle')
assert toggle and toggle.get('AXLabel') == ui.t('home.stack.fanOut', count=4), toggle and toggle.get('AXLabel')
shot = ui.snap('01-stacked')
assert_colour(shot, card_fill(front['frame']), token('--color-card-progress', ui.appearance), '要你处理 card')
assert seen() == [], f'a card behind the front was marked seen: {seen()}'

ui.tap('live-cards-toggle')
ui.settled(lambda items: by_id(items, 'live-cards-toggle') if by_id(items, 'live-card-bountyInProgress') else None,
           'the cards did not fan out')
ui.wait_label('live-cards-toggle', lambda label: label == ui.t('home.stack.collapse'), 'the stack did not fan out')
wait_seen(['fixture-bounty-02'])
items = ui.read()
labels = [i.get('AXLabel') or '' for i in items if (i.get('AXUniqueId') or '') == 'live-card-waitingConfirm']
assert any('这次没选上' in label for label in labels) and any('等人申请' in label for label in labels), labels
shot = ui.snap('02-fanned')
waiting = next(i for i in items if i.get('AXUniqueId') == 'live-card-waitingConfirm')
if waiting['frame']['y'] + waiting['frame']['height'] < items[0]['frame']['height'] - 100:
    assert_colour(shot, card_fill(waiting['frame']), token('--color-card-calm', ui.appearance), '等对方 card')

for _ in range(6):
    toggle = ui.settled(lambda items: by_id(items, 'live-cards-toggle'), 'the toggle never settled')
    if 180 < toggle['frame']['y'] < 650:
        break
    ui.swipe((200, 400), (200, 550) if toggle['frame']['y'] <= 180 else (200, 250), duration=1.5)
ui.tap('live-cards-toggle')
ui.wait_label('live-cards-toggle', lambda label: label == ui.t('home.stack.fanOut', count=4), 'the stack did not collapse')
for _ in range(4):
    stage = by_id(ui.read(), 'home-stage-live')
    if stage and stage['frame']['y'] > 100:
        break
    ui.swipe((200, 250), (200, 750))
peek = ui.settled(lambda items: by_id(items, 'live-card-peek-1'), 'the peek never settled')['frame']
ui.tap_point(peek['x'] + peek['width'] / 2, peek['y'] + peek['height'] - 8)
ui.wait_label('live-cards-toggle', lambda label: label == ui.t('home.stack.collapse'), 'the peek did not fan out again')
ui.settled(lambda items: by_id(items, 'live-card-bountyInProgress'), 'the cards did not fan out again')
time.sleep(5)  # NSUserDefaults reaches the plist asynchronously; give a second mark time to land before asserting none did
assert seen() == ['fixture-bounty-02'], f'the one-time card was marked again: {seen()}'

ui.tap('live-card-bountyAction')
ui.element('bounty-applicant-fixture-applicant-jie')
ui.snap('03-applicants')
print('PASS: bounty cards ranked, labelled, fanned, marked seen once and opened')
