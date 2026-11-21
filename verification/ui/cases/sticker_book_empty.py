"""With no stickers, 我的 shows 贴纸本 · 0 张, and the sticker book shows the full-size 小貘 with 还没有贴纸 and how to
earn one instead of the deck: no card, no 月历 / 分享 pills and no 今天 button."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/stickers/', 'src/app/(tabs)/me/', 'src/features/account/']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyStickers', 'none']

ui = UI(*sys.argv[1:])
reach_home(ui)
ui.tap('tab-me')
row = ui.wait_label('me-stickers', lambda label: ui.tn('stickers.count', 0) in label, 'the 我的 row does not count 0 stickers')
assert ui.t('stickers.book.title') in (row.get('AXLabel') or ''), row.get('AXLabel')
ui.tap('me-stickers')
ui.element('sticker-book-empty')
items = ui.read()
labels = [i.get('AXLabel') for i in items]
assert ui.t('stickers.empty.title') in labels and ui.t('stickers.empty.body') in labels, labels
assert by_id(items, 'sticker-card-0') is None, 'an empty book shows a card'
for absent in ('sticker-book-calendar', 'sticker-book-share', 'sticker-stack-position'):
    assert by_id(items, absent) is None, f'an empty book shows {absent}'
assert ui.t('stickers.book.today') not in labels, 'an empty book offers 今天'
ui.capture('01-empty')
print('PASS: the empty sticker book explains how to earn the first sticker')
