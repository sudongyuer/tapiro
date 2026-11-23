"""bounty.flow.eta-overdue on the status screen: the poster's helper said they would arrive seven minutes ago and has not
tapped 完成. The 出发了 step reads 预计 … 到，已晚 N 分钟 (N is 7, or 8 if the launch crossed a minute) in the warning
colour instead of a plain 预计 … 到, and the summary still reads 阿杰在路上. With the screen left alone, the count moves
to N + 1 when the next minute of lateness begins; the fixture's arrival time never changes, so only the screen's own
clock can move it."""
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from board import ink_box  # noqa: E402
from driver import UI, by_id, token  # noqa: E402
from hourcycle import clock  # noqa: E402
from ocr import lines_in  # noqa: E402

DEPS = ['src/features/bounty/status/', 'src/lib/etaLate.ts', 'src/lib/useNowUntil.ts',
        'src/lib/i18n/locales/bounty/', 'verification/ui/ocr.py']
SCENE = 'bounty-status'
LOCALES = ['zh-Hans', 'ms']
BUDGET = 240
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyStatus', 'enRouteLate', '-uiVerifyBountyRole', 'poster']
TINT = 30
TINTED_TEXT_MIN = 40

ui = UI(*sys.argv[1:])
DAY = rf"(?:(?:{re.escape(ui.t('bounty.post.confirm.today'))})\s?)?"
LATE = re.compile(ui.pattern('bounty.status.note.etaLate_other', time=DAY + clock(), count=r'(\d+)'))


def started():
    found = ui.settled(lambda items: by_id(items, 'bounty-status-step-started'), 'the 出发了 step never settled')
    return found.get('AXLabel') or ''


def late_count(text):
    found = LATE.search(text)
    return int(found.group(1)) if found else None


text = started()
count = late_count(text)
assert count in (7, 8), f'the 出发了 step does not say how late the arrival is: {text!r}'
summary = by_id(ui.read(), 'bounty-status-summary')
assert summary and summary.get('AXLabel') == ui.t('bounty.status.summary.poster.enRoute', name='阿杰'), summary
ui.at_rest()
shot = ui.snap('01-late')
read = lines_in(shot, ui.locale)
tail = re.sub(r'[\s,，]', '', ui.t('bounty.status.note.etaLate_other', count='\x01', time='\x00').split('\x00')[1])
tail = re.compile(re.escape(tail).replace('\x01', r'\d+'))
seen = [line for line in read if tail.search(re.sub(r'[\s,，]', '', line['text']))]
assert seen, f'OCR found no arrival line in {[line["text"] for line in read]}'
box = max(seen, key=lambda line: line['width'])
warm = ink_box(shot, box, token('--color-warning', ui.appearance), TINT)
assert warm and warm['count'] >= TINTED_TEXT_MIN, f'the late arrival line is not in the warning colour: {warm} in {box}'

started_at = time.time()
ui.wait(lambda items: (late_count((by_id(items, 'bounty-status-step-started') or {}).get('AXLabel') or '')
                       or 0) > count or None,
        f'the count stayed at {count} with the screen open', timeout=75)
moved = late_count(started())
assert moved == count + 1, f'the count jumped from {count} to {moved}'
print(f'the count moved after {time.time() - started_at:.0f}s')
ui.at_rest()
ui.capture('02-next-minute')
print(f'PASS: the overdue arrival reads 已晚 {count} 分钟 in the warning colour and moves to {moved} on its own')
