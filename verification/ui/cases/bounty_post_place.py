"""「＋ 地点」 pushes the place search; picking Sunway Geo Residences fills the place name (editable, n/80) and shows the
exact-address row; 移除地点 collapses back to 「＋ 地点」; picking 用当前位置 asks for permission (the verify location
fixture answers the prompt with 允许, so no system alert is drawn) and fills the reverse-geocoded name; confirm shows
the name and the exact-address note, and the published draft carries the coordinates (read from the fixture's
record in the app's defaults)."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import (DEMO_TITLE, end_editing, field_text, form_scroll_to, next_step, open_post, paste_into,  # noqa: E402
                    publish_and_close, published_args, search_places)
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/bounty/', 'src/app/bounty-post/', 'src/app/(tabs)/bounty/', 'src/lib/location/',
        'verification/ui/bounty.py', 'src/ui/TaskCard.tsx', 'src/ui/SheetFrame.tsx']
LOCALES = ['zh-Hans', 'ms']
ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyBountyDraft', 'demo', '-uiVerifyLocation', 'undetermined']
BUDGET = 300
GEO, PYRAMID, EDITED = 'Sunway Geo Residences', 'Sunway Pyramid', 'Sunway Geo 宿舍'
PYRAMID_POINT = (3.0733, 101.6078)
ADDRESS = 'A-12-03'

ui = UI(*sys.argv[1:])


def label_reads(text):
    ui.wait(lambda items: (by_id(items, 'bounty-post-place-label') or {}).get('AXValue') == text,
            f'the place name does not read {text!r}')


def counter(count):
    expected = ui.t('bounty.post.form.countLabel', count=count, max=80)
    ui.wait_label('bounty-post-place-label-count', lambda label: label == expected, f'the place counter is not {count}/80')


def open_search():
    add = form_scroll_to(ui, 'bounty-post-add-place')
    assert_touch_target(add, '＋ 地点')
    ui.tap('bounty-post-add-place')
    ui.element('place-search-current')
    ui.gone('bounty-post-form')


open_post(ui)
ui.wait(lambda items: field_text(ui, items, 'bounty-post-title') == DEMO_TITLE, 'the demo draft is not in the form')
ui.wait_label('bounty-post-add-place', lambda label: label == ui.t('bounty.place.addLabel'), '「＋ 地点」 has no label')
assert by_id(ui.read(), 'bounty-post-address') is None, 'the address row shows before a place is picked'
form_scroll_to(ui, 'bounty-post-add-place')
ui.capture('01-no-place')

open_search()
search_places(ui, 'sunway')
ui.wait_label('place-search-result-0', lambda label: GEO in label, f'{GEO} is not the first result')
ui.capture('02-search')
ui.tap('place-search-result-0')
ui.element('bounty-post-form')
ui.gone('place-search-current')
form_scroll_to(ui, 'bounty-post-address')
label_reads(GEO)
counter(len(GEO))
ui.wait_label('bounty-post-place', lambda label: GEO in label, 'the 地点 row does not show the pick')
ui.capture('03-picked')

paste_into(ui, 'bounty-post-place-label', EDITED)
counter(13)
end_editing(ui)
ui.capture('04-edited')

assert_touch_target(form_scroll_to(ui, 'bounty-post-remove-place'), '移除地点')
ui.tap('bounty-post-remove-place')
ui.element('bounty-post-add-place')
ui.gone('bounty-post-address')
ui.gone('bounty-post-place-label')
ui.capture('05-removed')

open_search()
ui.tap('place-search-current')
ui.element('bounty-post-form')
form_scroll_to(ui, 'bounty-post-address')
label_reads(PYRAMID)
ui.capture('06-current-location')
address = by_id(ui.read(), 'bounty-post-address')['frame']
ui.tap_point(address['x'] + address['width'] / 2, address['y'] + address['height'] / 2)
ui.type(ADDRESS)
ui.wait(lambda items: (by_id(items, 'bounty-post-address') or {}).get('AXValue') == ADDRESS, 'the address was not typed')
end_editing(ui)

next_step(ui)
ui.element('bounty-post-confirm')
ui.wait_label('bounty-post-preview-text', lambda label: PYRAMID in label, 'the preview card does not show the place')
ui.wait_label('bounty-post-summary-place', lambda label: PYRAMID in label, 'the summary has no place row')
ui.labelled(ui.t('bounty.post.confirm.addressNote'))
ui.capture('07-confirm')

publish_and_close(ui)
sent = published_args(ui)
assert sent['place_label'] == PYRAMID, f'published place label {sent["place_label"]!r}'
assert (sent['latitude'], sent['longitude']) == PYRAMID_POINT, f'published point {sent["latitude"]}, {sent["longitude"]}'
assert sent['address'] == ADDRESS, f'published address {sent["address"]!r}'
ui.capture('08-published')
print(f'PASS: pick, rename (13/80), remove, current location, confirm note; published {PYRAMID_POINT}')
