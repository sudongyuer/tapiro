"""Hand art on the live card (86A, 94A, 152A): through 直接写 with an empty title the card shows the 其他 drawing; half a
second after typing "parcel" the card's art reads 配图：快递箱 and the field stays where it was (the card has a fixed
height); tapping the art swaps it for the next drawing (the milk-tea cup), and publishing sends that art id with the
bounty. The landing on the new home card is checked on a device."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import pick_category, publish_and_close, published_args, reach_confirm, typed, open_post  # noqa: E402
from driver import UI, assert_touch_target  # noqa: E402

DEPS = ['src/features/bounty/post/', 'src/app/bounty-post/', 'src/lib/handArt/', 'assets/hand-art/',
        'src/ui/TaskCard.tsx', 'verification/ui/bounty.py']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'none', '-uiVerifyPostCost', 'free']
ART = 'bounty-post-live-art'
COLOURFUL_MIN = 400


def art_label(ui, name):
    return ui.t('bounty.post.form.art', name=ui.t(f'stickers.art.{name}'))


def wait_art(ui, name):
    expected = art_label(ui, name)
    return ui.wait_label(ART, lambda label: label == expected, f'the live card art is not {expected!r}')


ui = UI(*sys.argv[1:])
open_post(ui)
wait_art(ui, 'other')
field_before = ui.element('bounty-post-title')['frame']
typed(ui, 'bounty-post-title', 'parcel', 'Parcel')
art = wait_art(ui, 'parcel')
field_after = ui.element('bounty-post-title')['frame']
assert abs(field_after['y'] - field_before['y']) <= 1, f'the title field moved: {field_before} → {field_after}'
assert_touch_target(art, 'the live card art')
shot = ui.snap('01-parcel')
drawn = shot.count(art['frame'], lambda rgb: max(rgb) - min(rgb) > 40)
print(f'art pixels: {drawn}')
assert drawn > COLOURFUL_MIN, f'the art area draws nothing ({drawn} colourful pixels)'

ui.tap(ART)
wait_art(ui, 'tea')
ui.capture('02-swapped')
pick_category(ui, 'pickup')
typed(ui, 'bounty-post-reward', '8')
reach_confirm(ui)
ui.capture('03-confirm')
publish_and_close(ui)
args = published_args(ui)
assert args.get('art') == 'tea', f'the publish sent art {args.get("art")!r}, expected the swapped tea'
print('PASS: the live card art follows the title without moving the field, a tap swaps it, and the shown art is published')
