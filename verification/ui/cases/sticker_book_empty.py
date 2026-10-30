"""With no stickers, 我的 shows 一起办成的事 · 0 张, and the sticker book 一起办成的事 shows the full-size 小貘 with 还没有贴纸 and how to earn one instead of a grid."""
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
title = ui.element('sticker-book-title')
assert title.get('AXLabel') == ui.t('stickers.book.title'), title
items = ui.read()
labels = [i.get('AXLabel') for i in items]
assert ui.t('stickers.empty.title') in labels and ui.t('stickers.empty.body') in labels, labels
assert by_id(items, 'sticker-cell-0') is None, 'an empty book shows a sticker'
count = by_id(items, 'sticker-book-count')
assert count and count.get('AXLabel') == ui.t('stickers.book.summary', total=ui.tn('stickers.count', 0), sub=ui.t('stickers.book.sub')), count
ui.capture('01-empty')
print('PASS: the empty sticker book explains how to earn the first sticker')
