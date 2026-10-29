"""A ¥ bounty keeps its own currency everywhere (65A). Home: the in-progress live card reads ¥50 and no RM. Board: the
¥50 card reads ¥50 with no 约 line, beside a ¥30 card and RM cards. Detail pushed from the ¥50 card: ¥50 with 约 RM 32.47
on its own line below, read after the amount. The ¥30 bounty has no fresh rate: its detail shows ¥30 and no 约 line.
Status, poster, assigned: ¥50 and 约 RM 32.47 below it. Once a payment exists (the markedPaid fixture) the 约 line shows the
payment's locked conversion, RM 30.61 at ¥1 = RM 0.6122, instead of today's rate, and the pay step reads ¥50."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import visible  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/bounty/', 'src/features/home/', 'src/app/(tabs)/', 'verification/ui/bounty.py',
        'verification/ui/board.py']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300
HOME = ['-uiVerifyBoard', 'cny', '-uiVerifyShellFeed', 'none', '-uiVerifyBountyLive', 'posterAssigned',
        '-uiVerifyBountyLiveData', 'cny']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBoard', 'cny', '-uiVerifyShellFeed', 'none', '-uiVerifyBountyLive',
        'posterAssigned', '-uiVerifyBountyLiveData', 'cny']
REFERENCE_CARD = 'bounty-card-fixture-cny-01'
NO_RATE_CARD = 'bounty-card-fixture-cny-02'
YUAN = '¥50'
NO_RATE_YUAN = '¥30'
REFERENCE = 'RM 32.47'
LOCKED = 'RM 30.61'

ui = UI(*sys.argv[1:])


def label(identifier):
    return ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled').get('AXLabel') or ''


def assert_reward(prefix, amount):
    text = label(f'{prefix}-reward')
    assert text == ui.t('bounty.post.confirm.rewardLabel', amount=amount), f'{prefix}-reward reads {text!r}'


def assert_reference_below(prefix, amount=REFERENCE):
    items = ui.read()
    reward = by_id(items, f'{prefix}-reward')
    reference = by_id(items, f'{prefix}-reference')
    assert reference, f'{prefix} shows no 约 line'
    assert reference.get('AXLabel') == ui.t('bounty.reference', amount=amount), reference.get('AXLabel')
    assert reference['frame']['y'] >= reward['frame']['y'] + reward['frame']['height'] - 1, \
        f'the 约 line {reference["frame"]} is not below the amount {reward["frame"]}'
    assert items.index(reward) < items.index(reference), 'VoiceOver reaches the 约 line before the amount'


reach_home(ui)
live = ui.settled(lambda items: by_id(items, 'live-card-bountyInProgress'), 'the ¥ live card never settled')
live_label = live.get('AXLabel') or ''
assert YUAN in live_label and 'RM' not in live_label, live_label
ui.at_rest()
ui.capture('01-home-card')

card = visible(ui, REFERENCE_CARD)
card_label = card.get('AXLabel') or ''
assert YUAN in card_label, card_label
assert 'RM' not in card_label and '32.47' not in card_label, card_label
no_rate = visible(ui, NO_RATE_CARD)
assert NO_RATE_YUAN in (no_rate.get('AXLabel') or ''), no_rate.get('AXLabel')
card = visible(ui, REFERENCE_CARD)
ui.at_rest()
ui.capture('02-board-cards')

f = card['frame']
ui.tap_point(f['x'] + f['width'] * 0.4, f['y'] + 30)
ui.element('bounty-detail-apply')
assert_reward('bounty-detail', YUAN)
assert_reference_below('bounty-detail')
ui.at_rest()
ui.capture('03-detail')

relaunch(ui, drop=HOME, add=['-uiVerifyScene', 'bounty-detail', '-uiVerifyBoard', 'cny',
                             '-uiVerifyDetailId', 'fixture-cny-02'], ready='bounty-detail-apply')
assert_reward('bounty-detail', NO_RATE_YUAN)
ui.element('bounty-detail-place')
assert by_id(ui.read(), 'bounty-detail-reference') is None, 'a bounty without a fresh rate shows a 约 line'
ui.at_rest()
ui.capture('04-detail-no-rate')

status = ['-uiVerifyScene', 'bounty-status', '-uiVerifyBountyStatusData', 'cny', '-uiVerifyBountyRole', 'poster']
relaunch(ui, drop=HOME, add=[*status, '-uiVerifyBountyStatus', 'assigned'], ready='bounty-status-step-selected')
assert_reward('bounty-status', YUAN)
assert_reference_below('bounty-status')
ui.at_rest()
ui.capture('05-status')

relaunch(ui, drop=HOME, add=[*status, '-uiVerifyBountyStatus', 'markedPaid'], ready='bounty-status-step-payment')
assert_reward('bounty-status', YUAN)
assert YUAN in label('bounty-status-step-payment'), label('bounty-status-step-payment')
assert_reference_below('bounty-status', LOCKED)
ui.at_rest()
ui.capture('06-status-paid')
