"""The place search scene: an empty query shows only 用当前位置; typing lists the three fixture places as 44 pt rows and
tapping one picks it; no results show the empty copy; a failed search shows 重试, which recovers; a place that cannot be
resolved shows an inline notice and the screen stays."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from bounty import relaunch, search_places  # noqa: E402
from driver import UI, assert_touch_target, by_id  # noqa: E402

DEPS = ['src/features/bounty/place/', 'src/lib/location/', 'verification/ui/bounty.py']
SCENE = 'place-search'
ARGS = ['-uiVerifyPlaces', 'ok']
PLACES = ['Sunway Geo Residences', 'Sunway University', 'Sunway Pyramid']
QUERY = 'sunway'

ui = UI(*sys.argv[1:])


def restart(fixture):
    relaunch(ui, drop=ARGS, add=['-uiVerifyScene', SCENE, '-uiVerifyPlaces', fixture], ready='ui-verify-ready')
    ui.element('place-search-current')


ui.element('ui-verify-ready')
current = ui.wait_label('place-search-current', lambda label: ui.t('bounty.place.current') in label,
                        '用当前位置 is not the first row')
assert_touch_target(current, '用当前位置')
assert by_id(ui.read(), 'place-search-result-0') is None, 'results are listed before anything is typed'
ui.capture('01-empty-query')

search_places(ui, QUERY)
for index, title in enumerate(PLACES):
    row = ui.wait_label(f'place-search-result-{index}', lambda label, title=title: title in label,
                        f'result {index} does not read {title}')
    assert_touch_target(row, title)
assert by_id(ui.read(), 'place-search-result-3') is None, 'more than the three fixture places are listed'
ui.capture('02-results')
ui.tap('place-search-result-0')
ui.element('place-search-scene-picked')

restart('none')
search_places(ui, QUERY)
ui.wait_label('place-search-empty', lambda label: ui.t('bounty.place.empty') in label, 'no results do not say so')
ui.capture('03-none')

restart('fail')
search_places(ui, QUERY)
ui.wait_label('place-search-failed', lambda label: ui.t('bounty.place.failed') in label, 'a failed search is not shown')
retry = ui.element('place-search-retry')
assert_touch_target(retry, '重试')
assert by_id(ui.read(), 'place-search-empty') is None, 'a failed search is shown as empty'
ui.capture('04-failed')
ui.tap('place-search-retry')
ui.wait_label('place-search-result-0', lambda label: PLACES[0] in label, '重试 did not recover the results')
ui.gone('place-search-failed')
ui.capture('05-recovered')

restart('resolveFail')
search_places(ui, QUERY)
ui.tap('place-search-result-0')
ui.wait_label('place-search-notice', lambda label: ui.t('bounty.place.resolveFailed') in label,
              'a place that could not be resolved shows no notice')
assert by_id(ui.read(), 'place-search-scene-picked') is None, 'a failed resolve still picked a place'
ui.element('place-search-result-0')
ui.capture('06-resolve-failed')
print('PASS: current-location row first, three results, empty, failed + 重试, resolve failure keeps the screen')
