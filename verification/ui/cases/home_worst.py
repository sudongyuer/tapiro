"""Worst-case data (40-character names, long routes, RM 12,345.60, 1,284 unread) renders on home, the accessory, the badge and 问小貘."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from walk import walk_home  # noqa: E402

ARGS = ['-uiVerifyFixture', 'worst']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300

walk_home(UI(*sys.argv[1:]), 'worst')
