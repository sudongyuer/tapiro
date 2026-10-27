"""Tapping 「+」 with one payment unpaid for 8 days opens the form and shows 先付清再发新的 naming 阿杰, RM 15 and 8 days;
先写着 leaves the form with the draft, and confirm shows the blocked state. Without unpaid payments no hint appears."""
import re
import sys
import time

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import DEMO_TITLE, field_text, next_step, open_post, relaunch  # noqa: E402
from driver import UI  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'verification/ui/bounty.py',
        'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'demo', '-uiVerifyUnpaid', 'old']
BUDGET = 240
QUIET_S = 4

ui = UI(*sys.argv[1:])
open_post(ui)
title = ui.t('bounty.post.hint.title')
body = re.compile(ui.pattern('bounty.post.hint.old', name='阿杰', amount=r'RM\s?15', days='8'))
ui.wait(lambda items: any(i.get('AXLabel') == title for i in items)
        and any(body.search(i.get('AXLabel') or '') for i in items), 'the 8-day hint did not appear over the form')
ui.labelled(ui.t('bounty.post.hint.pay'))
ui.capture('01-hint')
ui.tap_label(ui.t('bounty.post.hint.later'))
ui.wait(lambda items: not any(i.get('AXLabel') == title for i in items), 'the hint stayed after 先写着')
ui.wait(lambda items: field_text(ui, items, 'bounty-post-title') == DEMO_TITLE, 'the form lost the draft')
next_step(ui)
ui.wait_label('bounty-post-blocked', lambda label: ui.t('bounty.post.blocked.title') in label,
              'confirm is not blocked')
ui.element('bounty-post-pay')
ui.capture('02-confirm-blocked')

relaunch(ui, drop=['-uiVerifyUnpaid', 'old'])
open_post(ui)
ui.wait(lambda items: field_text(ui, items, 'bounty-post-title') == DEMO_TITLE, 'the form did not open with the draft')
deadline = time.monotonic() + QUIET_S
while time.monotonic() < deadline:
    assert not any(i.get('AXLabel') == title for i in ui.state()), 'a hint appeared without unpaid payments'
    time.sleep(0.3)  # polling interval while the status answers, not an assertion
ui.gone('bounty-post-pay', timeout=1)
ui.capture('03-no-hint')
print('PASS: the unpaid hint shows once over the open form and only when blocked')
