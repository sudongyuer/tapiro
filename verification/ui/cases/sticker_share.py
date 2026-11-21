"""Sharing (sticker book deck, S5–S7): 分享 under the deck opens a large sheet with the card poster (the art, the
handwritten date, the title, the 小貘 wordmark chip, the user's own arts scattered around) and no counterpart name. The
round button at the poster's top-right cycles 纸白 → 暖橙 → 夜色 → 纸白 and the poster's own background follows the
tokens. 存到相册 snapshots the poster through the kit and, at the verify-mode Photos boundary, turns into 已存到相册.
From 月历, 分享十月 opens the month poster: 十月 with all 31 days drawn and 这个月一起办成了 33 件事."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_touch_target, by_id, close, reach_home, token  # noqa: E402

DEPS = ['src/features/stickers/', 'src/app/sticker-share.tsx', 'src/app/sticker-calendar.tsx', 'src/app/_layout.tsx',
        'modules/tapiro-kit/ios/PosterSnapshot.swift', 'src/ui/theme/tokens.ts']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyStickers', 'month', '-uiVerifyToday', '2026-11-21']
FILLS = {'paper': '--color-paper', 'tint': '--color-poster-tint', 'night': '--color-poster-night'}
OCTOBER = {'zh-Hans': '十月', 'en': 'October', 'ms': 'Oktober'}


def colourful(rgb):
    return max(rgb) - min(rgb) > 40


ui = UI(*sys.argv[1:])


def poster_fill(shot, poster, name):
    f = poster['frame']
    corner = {'x': f['x'] + f['width'] * 0.45, 'y': f['y'] + 6, 'width': 10, 'height': 6}
    expected = token(FILLS[name], 'light')
    found = shot.count(corner, lambda rgb: close(rgb, expected, 8))
    return found


def cycle_backgrounds(prefix):
    poster = ui.element('sticker-poster')
    button = ui.element('sticker-share-background')
    assert_touch_target(button, 'the background button')
    assert button['frame']['x'] > poster['frame']['x'] + poster['frame']['width'] / 2, 'the button is not top-right'
    assert button['frame']['y'] < poster['frame']['y'] + 80, 'the button is not at the poster top'
    for step, name in enumerate(('paper', 'tint', 'night')):
        now = ui.element('sticker-share-background')
        assert str(now.get('AXValue')) == ui.t(f'stickers.share.backgrounds.{name}'), now
        ui.at_rest()
        shot = ui.snap(f'{prefix}-{step + 1}-{name}')
        found = poster_fill(shot, poster, name)
        print(f'{prefix} {name}: {found} background pixels')
        assert found > 100, f'the {name} poster background is not {FILLS[name]} ({found})'
        ui.tap('sticker-share-background')
    ui.wait(lambda items: str((by_id(items, 'sticker-share-background') or {}).get('AXValue'))
            == ui.t('stickers.share.backgrounds.paper'), 'the background does not cycle back to 纸白')
    return poster


reach_home(ui)
ui.tap('tab-me')
ui.tap('me-stickers')
card = ui.element('sticker-card-0')
ui.tap('sticker-book-share')
ui.element('sticker-share')
poster = ui.element('sticker-poster')
label = poster.get('AXLabel') or ''
assert '帮' in label or '拼车' in label, f'the card poster does not read the title: {label}'
for name in ('Lily', '阿杰', '小林', 'Aiman', 'Hana'):
    assert name not in label, f'the card poster names the counterpart {name}: {label}'
assert poster['frame']['height'] > poster['frame']['width'] * 1.7, f'the poster is not a 9:16 story: {poster}'
cycle_backgrounds('01-card')
save = ui.element('sticker-share-save')
assert save.get('AXLabel') == ui.t('stickers.share.save'), save
assert_touch_target(save, '存到相册')
assert_touch_target(ui.element('sticker-share-share'), '分享…')
ui.tap('sticker-share-save')
ui.wait_label('sticker-share-save', lambda text: text == ui.t('stickers.share.saved'),
              'the save button does not turn into 已存到相册', timeout=30)
assert by_id(ui.read(), 'sticker-share-error') is None, 'a saved poster shows an error'
ui.capture('02-card-saved')
ui.tap_label(ui.t('stickers.share.close'))
ui.gone('sticker-share')

ui.tap('sticker-book-calendar')
ui.element('sticker-calendar')
for _ in range(6):
    pill = ui.element('sticker-calendar-share')
    if pill.get('AXLabel') == ui.t('stickers.calendar.share', month=OCTOBER[ui.locale]):
        break
    ui.swipe((200, 300), (200, 700), 1.2)
    ui.at_rest()
ui.wait_label('sticker-calendar-share', lambda text: text == ui.t('stickers.calendar.share', month=OCTOBER[ui.locale]),
              'the share pill never names October')
ui.at_rest()
ui.tap('sticker-calendar-share')
ui.element('sticker-share')
month = ui.wait_label('sticker-poster', lambda text: OCTOBER[ui.locale] in text, 'the month poster is not October')
assert ui.tn('stickers.poster.a11yMonth', 33, month=OCTOBER[ui.locale]) == month.get('AXLabel'), month
ui.at_rest()
shot = ui.snap('03-month')
f = month['frame']
grid = {'x': f['x'] + f['width'] * 0.12, 'y': f['y'] + f['height'] * 0.4,
        'width': f['width'] * 0.76, 'height': f['height'] * 0.2}
drawn = shot.count(grid, colourful)
print(f'month grid: {drawn} colourful pixels')
assert drawn > 8000, f'the month poster grid draws few arts ({drawn})'
cycle_backgrounds('04-month')
ui.tap('sticker-share-save')
ui.wait_label('sticker-share-save', lambda text: text == ui.t('stickers.share.saved'),
              'the month poster does not save', timeout=30)
ui.capture('05-month-saved')
print('PASS: both posters render without names, cycle three backgrounds and save through the kit snapshot')
