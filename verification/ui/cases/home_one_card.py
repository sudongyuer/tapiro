"""With a single in-progress bounty, home shows the live stage and one card with no peeks and no stack toggle; the
two-line bubble ends before the car."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, Shot, assert_home, by_id  # noqa: E402
from stage import assert_bubble_clear  # noqa: E402

DEPS = ['src/features/home/', 'src/features/shell/', 'src/app/(tabs)/_layout.tsx', 'src/app/(tabs)/bounty/',
        'src/ui/MascotStage', 'src/ui/stagePose.ts', 'verification/ui/stage.py']

ARGS = ['-uiVerifyShellFeed', 'bountyInProgress', '-uiVerifySignedIn', 'onboarded']

ui = UI(*sys.argv[1:])
items = assert_home(ui, 'one-card', 'live', ['bountyInProgress'])
stage = by_id(items, 'home-stage-live')['frame']
assert_bubble_clear(Shot(ui.output / 'one-card.png', stage['width']), stage, 'live', ui.appearance, wraps=True)
print('PASS: one card, no peeks, no toggle')
