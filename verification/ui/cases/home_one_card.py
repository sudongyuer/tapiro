"""With a single in-progress bounty, home shows the live stage and one card with no peeks and no stack toggle."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_home  # noqa: E402

ARGS = ['-uiVerifyShellFeed', 'bountyInProgress', '-uiVerifySignedIn', 'onboarded']

ui = UI(*sys.argv[1:])
assert_home(ui, 'one-card', 'live', ['bountyInProgress'])
print('PASS: one card, no peeks, no toggle')
