"""Short and single-count data (Jo, RM 0.50, 1 minute, 1 unread) renders on home, the accessory and the badge."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from walk import walk_home  # noqa: E402

ARGS = ['-uiVerifyFixture', 'one', '-uiVerifySignedIn', 'onboarded']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300

walk_home(UI(*sys.argv[1:]), 'one')
