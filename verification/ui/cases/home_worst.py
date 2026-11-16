"""Worst-case data (40-character names, long routes, RM 12,345.60, 1,284 unread) renders on home, the accessory, the badge and 问小貘;
小貘's bubble wraps the whole payee line and ends before 小貘."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI  # noqa: E402
from walk import walk_home  # noqa: E402

DEPS = [
    'src/features/home/',
    'src/features/shell/',
    'src/app/(tabs)/_layout.tsx',
    'src/app/(tabs)/bounty/',
    'src/app/ask.tsx',
    'src/ui/MascotStage',
    'src/ui/stagePose.ts',
    'verification/ui/walk.py',
    'verification/ui/stage.py',
    'verification/ui/ocr.py',
    'verification/ui/ocr.swift',
]

ARGS = ['-uiVerifyFixture', 'worst', '-uiVerifySignedIn', 'onboarded']
LOCALES = ['zh-Hans', 'ms']
BUDGET = 300

walk_home(UI(*sys.argv[1:]), 'worst')
