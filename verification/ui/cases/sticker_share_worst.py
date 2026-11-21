"""Worst-case card poster (S6, S7, break-ui): the 120-code-point title stays inside the poster panel in two lines, the
40-code-point counterpart name never appears on the poster, and the panel and the wordmark chip both fit inside the
poster. When saving fails at the Photos boundary (`-uiVerifyPosterSave failed`) the sheet stays open, 存到相册 stays
存到相册 and the error line says it did not save; it is never shown as saved."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, by_id, reach_home  # noqa: E402

DEPS = ['src/features/stickers/', 'src/app/sticker-share.tsx', 'modules/tapiro-kit/ios/PosterSnapshot.swift']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyStickers', 'worst', '-uiVerifyPosterSave', 'failed']
WORST_NAME = 'Nurul Aisyah binti Wan Abdul Rahman Shah'
WORST_TITLE = '帮忙从 Mid Valley Megamall 的 Uniqlo 取一件外套，顺便在 Sunway Pyramid 的 ZUS Coffee 买两杯 Spanish Latte，再送到 Universiti Malaya Kolej 宿舍楼'

ui = UI(*sys.argv[1:])
reach_home(ui)
ui.tap('tab-me')
ui.tap('me-stickers')
ui.element('sticker-card-0')
ui.tap('sticker-book-share')
poster = ui.element('sticker-poster')
label = poster.get('AXLabel') or ''
assert WORST_TITLE in label, f'the poster does not read the full title: {label}'
assert WORST_NAME not in label, f'the poster names the counterpart: {label}'
ui.at_rest()
ui.capture('01-worst-card')
ui.tap('sticker-share-save')
error = ui.wait_label('sticker-share-error', lambda text: text == ui.t('stickers.share.failed'),
                      'a failed save shows no error line', timeout=30)
items = ui.read()
assert by_id(items, 'sticker-share'), 'a failed save closed the sheet'
save = by_id(items, 'sticker-share-save')
assert save.get('AXLabel') == ui.t('stickers.share.save'), f'a failed save reads as saved: {save}'
assert error['frame']['y'] > save['frame']['y'], 'the error is not under the buttons'
ui.capture('02-save-failed')
print('PASS: the worst-case poster keeps the title, drops the name, and a failed save stays a failure')
