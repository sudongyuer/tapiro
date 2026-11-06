import time

from driver import by_id
from profile import label, rep_calls

SCENE = 'review-sheet'
SHEET = 'review-sheet'
BASE_ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']
DEPS = ['src/features/reputation/', 'src/app/review.tsx', 'src/app/_layout.tsx', 'src/debug/ReputationScenes.tsx',
        'src/lib/i18n/locales/reputation/', 'src/ui/PillButton.tsx', 'src/ui/InlineState.tsx',
        'verification/ui/review.py', 'verification/ui/profile.py']


def open_sheet(ui):
    return ui.element(SHEET, timeout=45)


def submitted(ui, count):
    return rep_calls(ui, 'submitReview', count)


def assert_one_submit(ui):
    # The call log reaches the plist late: wait for the first row, then give a replay the time to show.
    assert rep_calls(ui, 'submitReview', 1, timeout=15), 'nothing was submitted'
    time.sleep(2)
    calls = rep_calls(ui, 'submitReview', 2, timeout=2)
    assert len(calls) == 1, f'the review was sent again on its own: {calls}'
    return calls[0]


def checked(ui, identifier):
    element = ui.settled(lambda items: by_id(items, identifier), f'{identifier} never settled')
    return element.get('AXValue') in ('1', 1) or 'selected' in (element.get('AXTraits') or [])


def sealed(ui, name, days):
    ui.element('review-sealed-ok', timeout=20)
    title = label(ui, 'review-sealed-title')
    assert title == ui.t('reputation.sheet.sealedTitle', name=name), title
    note = label(ui, 'review-sealed-note')
    assert note == ui.tn('reputation.sheet.sealedNote', days, name=name), note
