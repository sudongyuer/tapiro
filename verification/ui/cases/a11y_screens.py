"""A tour of the core screens (welcome, sign-in, onboarding, home, posting, a bounty's detail, applicants and status, the
pay sheet, 我的 and 收款方式, the ride list, form, confirm and detail, a chat thread, 消息, 问小貘, the coin page, settings
and 小貘 settings): on each one every interactive element has a VoiceOver label in the run's language, no label is an
identifier or an SF Symbol name, and every control with a Tapiro testID is at least 44 pt. Run with --text-size ax5 it
is the large-text audit: the same screens at the largest accessibility size, one screenshot each."""
import json
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from a11y import problems  # noqa: E402
from bounty import relaunch  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['verification/ui/a11y.py', 'verification/ui/bounty.py', 'src/debug/']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded']
BUDGET = 900
SIGNED_IN = ['-uiVerifySignedIn', 'onboarded']
QUIET = ['-uiVerifyShellFeed', 'none']
# A hitSlop brings these to 44 pt, which the accessibility frame does not show: the terms links are one line of
# footnote text and the belly bar is a 27 pt row.
TERMS = ['welcome-terms-link', 'welcome-privacy-link']
BELLY = ['ask-belly']

# A scene that pushes a screen leaves its ready marker under it, so those wait for the pushed screen instead.
SCENES = [
    ('welcome', [], TERMS, True),
    ('sign-in', [], TERMS, True),
    ('profile-setup', [], [], True),
    ('language-step', [], [], True),
    ('bounty-post', [*QUIET, '-uiVerifyBountyDraft', 'demo'], [], False),
    ('bounty-confirm', [*QUIET, '-uiVerifyBountyDraft', 'demo'], [], False),
    ('bounty-detail', QUIET, [], False),
    ('bounty-applicants', QUIET, [], False, 'bounty-applicants'),
    ('bounty-status', [*QUIET, '-uiVerifyBountyStatus', 'done'], [], False, 'bounty-status-title'),
    ('pay-sheet', [], [], False),
    ('ride-list', QUIET, [], False),
    ('ride-form', QUIET, [], False),
    ('ride-confirm', QUIET, [], False),
    ('ride-detail', [*QUIET, '-uiVerifyRideDetail', 'viewer'], [], False, 'ride-detail-ticket'),
    ('chat-thread', [*QUIET, '-uiVerifyChat', '1'], [], False, 'chat-composer-input'),
    ('profile', QUIET, [], False, 'profile-screen'),
    ('coins-page', [*QUIET, '-uiVerifyCoins', 'many'], [], False, 'coins-screen'),
    ('settings', QUIET, [], False),
    ('tapir-settings', QUIET, [], False, 'tapir-settings-screen'),
    ('sticker-book', [*QUIET, '-uiVerifyStickers', 'seven'], [], False),
]
TABS = [('tab-me', 'me-payee', 'me', []), ('me-payee', None, 'payee', []), ('tab-messages', None, 'messages', []),
        ('tab-ask-tapir', 'ask-tapir-sheet', 'ask', BELLY)]

ui = UI(*sys.argv[1:])
found = []


def check(name, allow=()):
    ui.capture(name)
    tree = json.loads((ui.output / f'{name}.json').read_text())
    found.extend(f'{name}: {problem}' for problem in problems(tree, allow))


ui.element('home-scroll')
ui.read()
check('00-home')
for tab, ready, name, allow in TABS:
    ui.tap(tab)
    if ready:
        ui.element(ready)
    ui.read()
    check(f'00-{name}', allow)

for index, (scene, extra, allow, signed_out, *pushed) in enumerate(SCENES, start=1):
    relaunch(ui, drop=SIGNED_IN if signed_out else (), add=['-uiVerifyScene', scene, *extra],
             ready=pushed[0] if pushed else 'ui-verify-ready')
    ui.read()
    check(f'{index:02d}-{scene}', allow)

for line in found:
    print(line)
assert not found, f'{len(found)} accessibility problems on the core screens; the first: {found[0]}'
print(f'PASS: {len(SCENES) + len(TABS) + 1} core screens labelled, no identifier labels, Tapiro controls at least 44 pt')
