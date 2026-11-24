"""The organiser moves the departure (改出发时间, 新的出发时间 one minute later, 保存): the ticket's status line keeps
the planned time struck through before the new one, and its VoiceOver label says 原定 with the planned time. Before
the change the planned time is drawn without a strike, so the strike check can fail."""
import re
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
import ocr  # noqa: E402
from driver import UI, close, dominant  # noqa: E402
from hourcycle import clock_at  # noqa: E402

DEPS = ['src/features/ride/detail/', 'verification/ui/ocr.py']
SCENE = 'ride-detail'
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none', '-uiVerifyRideDetail', 'organiser']
PLANNED = (6, 30)
MOVED = (6, 31)

ui = UI(*sys.argv[1:])


def time_box(shot, ticket, hour, minute):
    pattern = clock_at(hour, minute, ui.locale)
    read = ocr.lines_in(shot, ui.locale)
    lines = [line for line in read if ocr.inside(line, ticket, slack=4) and re.search(pattern, line['text'])]
    assert lines, f'{pattern} is not drawn on the ticket: {[line["text"] for line in read]}'
    line = lines[0]
    match = re.search(pattern, line['text'])
    text = line['text']
    total = advance(text) or 1
    left = line['x'] + line['width'] * advance(text[:match.start()]) / total
    width = line['width'] * advance(match.group(0)) / total
    return {'x': left, 'y': line['y'], 'width': width, 'height': line['height']}


# OCR gives one box per line; a Han character is about twice as wide as a digit, so the time's share of the line is
# measured by advance, not by character count (zh-Hans placed the box half a time to the left by count).
def advance(text):
    return sum(1.0 if ord(c) >= 0x2E80 else 0.3 if c in ' ·' else 0.6 for c in text)


# A line through the time is one unbroken run of ink across the digits; without it, every row through the middle of
# the digits breaks between them.
def longest_ink_run(shot, box):
    background = dominant(shot, {'x': box['x'] - 6, 'y': box['y'] - 4, 'width': box['width'] + 12,
                                 'height': box['height'] + 8})
    step = 1 / shot.scale
    best = 0.0
    y = box['y'] + box['height'] * 0.25
    while y < box['y'] + box['height'] * 0.75:
        run, x = 0.0, box['x']
        while x < box['x'] + box['width']:
            run = run + step if not close(shot.rgb(x, y), background, 24) else 0.0
            best = max(best, run)
            x += step
        y += step
    return best / box['width']


def ticket_frame():
    return ui.element('ride-detail-ticket')['frame']


ticket = ui.element('ride-detail-ticket')
assert ui.t('ride.detail.revisedA11y', time='') not in (ticket.get('AXLabel') or ''), ticket.get('AXLabel')
ui.at_rest()
shot = ui.snap('01-planned')
before = longest_ink_run(shot, time_box(shot, ticket['frame'], *PLANNED))
print(f'planned time before the change: longest ink run {before:.2f} of its width')
assert before < 0.4, f'the planned time already reads as struck ({before:.2f})'

ui.tap_label(ui.t('ride.detail.more'))
ui.tap_label(ui.t('ride.detail.menu.reviseTime'))
ui.element('ride-time-picker')
ui.tap('ride-time-confirm')
ui.gone('ride-time-picker')
planned = re.compile(ui.pattern('ride.detail.revisedA11y', time=clock_at(*PLANNED, ui.locale)))
ticket = ui.wait_label('ride-detail-ticket', lambda label: planned.search(label),
                       'the ticket does not say 原定 with the planned time')
assert re.search(clock_at(*MOVED, ui.locale), ticket.get('AXLabel') or ''), ticket.get('AXLabel')
ui.at_rest()
shot = ui.snap('02-revised')
old = time_box(shot, ticket['frame'], *PLANNED)
new = time_box(shot, ticket['frame'], *MOVED)
assert old['x'] + old['width'] <= new['x'] + 2, f'the planned time {old} is not before the new one {new}'
struck = longest_ink_run(shot, old)
fresh = longest_ink_run(shot, new)
print(f'after the change: planned {struck:.2f}, new {fresh:.2f}')
assert struck >= 0.6, f'the planned time is not struck through ({struck:.2f})'
assert fresh < 0.4, f'the new time reads as struck ({fresh:.2f})'
print('PASS: a moved departure strikes the planned time and shows the new one')
