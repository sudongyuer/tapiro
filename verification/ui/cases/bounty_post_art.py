"""Hand art while posting (86A, 94A): an empty title shows no art; half a second after typing "parcel" the form shows
the parcel drawing under the title, read as 配图：快递箱; 换一张 swaps it for the next drawing (the milk-tea cup), and
publishing sends that art id with the bounty. The landing on the new home card is checked on a device."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import pick_category, publish_and_close, published_args, reach_confirm, typed, open_post  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/bounty/post/', 'src/app/bounty-post/', 'src/lib/handArt/', 'assets/hand-art/',
        'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'none', '-uiVerifyPostCost', 'free']
ART = 'bounty-post-art-'
COLOURFUL_MIN = 2500


def shown_art(items):
    return next((item for item in items if (item.get('AXUniqueId') or '').startswith(ART)), None)


ui = UI(*sys.argv[1:])
open_post(ui)
assert shown_art(ui.read()) is None, 'an empty title already shows art'
assert by_id(ui.read(), 'bounty-post-swap-art') is None, '换一张 shows without art'
typed(ui, 'bounty-post-title', 'parcel', 'Parcel')
parcel = ui.element(f'{ART}parcel')
expected = ui.t('bounty.post.form.art', name=ui.t('stickers.art.parcel'))
assert parcel.get('AXLabel') == expected, parcel
swap = ui.element('bounty-post-swap-art')
assert_touch_target(swap, '换一张')
assert ui.t('bounty.post.form.swapArt') in (swap.get('AXLabel') or ''), swap
shot = ui.snap('01-parcel')
drawn = shot.count(parcel['frame'], lambda rgb: max(rgb) - min(rgb) > 40)
print(f'art pixels: {drawn}')
assert drawn > COLOURFUL_MIN, f'the art area draws nothing ({drawn} colourful pixels)'

ui.tap('bounty-post-swap-art')
ui.element(f'{ART}tea')
ui.gone(f'{ART}parcel')
ui.capture('02-swapped')
pick_category(ui, 'pickup')
typed(ui, 'bounty-post-reward', '8')
reach_confirm(ui)
ui.capture('03-confirm')
publish_and_close(ui)
args = published_args(ui)
assert args.get('art') == 'tea', f'the publish sent art {args.get("art")!r}, expected the swapped tea'
print('PASS: the art follows the title, 换一张 swaps it, and the shown art is published')
