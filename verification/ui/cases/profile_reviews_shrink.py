"""A head read of a person's 24 reviews answers the first 20, so the list shrinks at its end and the 20th row is the new last
one; the next page is asked for again and the rows after it come back. A signal 70 s after launch reads the first page again at the end of the list."""
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id  # noqa: E402
from gestures import drag  # noqa: E402
from profile import open_profile, rep_calls, review_id, review_ids, scroll_to  # noqa: E402

DEPS = ['src/features/reputation/', 'src/debug/ReputationScenes.tsx', 'src/lib/live/', 'src/lib/loadable.ts', 'verification/ui/profile.py', 'verification/ui/gestures.py']
SCENE = 'profile'
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyProfilePerson', 'fixture-person-mei',
        '-uiVerifyLive', '70000:bounty.reviewed:x']
CURSOR_ID = 'fixture-profile-review-020'

ui = UI(*sys.argv[1:])
open_profile(ui)
scroll_to(ui, 'profile-all-reviews')
ui.tap('profile-all-reviews')
ui.element('profile-reviews', timeout=30)
ui.element(review_id(1), timeout=30)
items = ui.read()
w, h = items[0]['frame']['width'], items[0]['frame']['height']
for _ in range(14):
    if by_id(ui.read(), review_id(24)) is not None:
        break
    drag(ui, (w / 2, h * 0.8), (w / 2, h * 0.2))
drag(ui, (w / 2, h * 0.8), (w / 2, h * 0.2))
ui.at_rest()
items = ui.read()
last = by_id(items, review_id(24))
assert last is not None and 0 <= last['frame']['y'] < h, f'the last review never came on screen: {review_ids(items)}'
print(f'on screen before the read: {review_ids(items)}')
ui.capture('01-end')
assert len(asked_before := [c for c in rep_calls(ui, 'profileReviews', 3) if c['before'] == CURSOR_ID]) == 1, asked_before
heads = lambda: [c for c in rep_calls(ui, 'profileReviews', 99, timeout=0) if c['before'] is None]  # noqa: E731
first = len(heads())
deadline = time.monotonic() + 90
while time.monotonic() < deadline and len(heads()) == first:
    time.sleep(1)
assert len(heads()) > first, 'the head read never came'
asked = lambda: [c for c in rep_calls(ui, 'profileReviews', 99, timeout=0) if c['before'] == CURSOR_ID]  # noqa: E731
deadline = time.monotonic() + 15
while time.monotonic() < deadline and len(asked()) < 2:
    time.sleep(1)
ui.at_rest()
ui.capture('02-after-the-read')
print(f'on screen after: {review_ids(ui.read())}')
assert len(asked()) == 2, f'stalled: the page after {CURSOR_ID} was not asked for again'
ui.wait(lambda items: by_id(items, review_id(21)) is not None, 'the reviews after the 20th did not come back')
print('PASS: the next page is asked for again after the shrink')
