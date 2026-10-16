"""With a ride and an in-progress bounty and nothing to pay, home shows the live stage with the ride card in front of a two-card stack."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_home  # noqa: E402

LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifyShellFeed', 'rideSoon,bountyInProgress', '-uiVerifySignedIn', 'onboarded']

ui = UI(*sys.argv[1:])
assert_home(ui, 'live', 'live', ['rideSoon', 'bountyInProgress'])
print('PASS: live stage, ride card in front, two-card stack')
