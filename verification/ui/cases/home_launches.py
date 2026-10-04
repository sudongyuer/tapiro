"""The app launches offline in verify mode and shows the home screen filling the display."""
import sys

sys.path.insert(0, str(__import__('pathlib').Path(__file__).resolve().parents[1]))
from driver import UI, assert_appearance, frame  # noqa: E402

ui = UI(*sys.argv[1:])
ui.element('ui-verify-ready')
items = ui.state()
screen = items[0]['frame']
f = frame(items[1])
assert f['width'] == screen['width'], f'app content is {f["width"]} wide, screen is {screen["width"]}'
assert f['height'] >= screen['height'] * 0.9, f'app content is {f["height"]} tall, screen is {screen["height"]}'
shot = ui.capture('home')
assert_appearance(shot, ui.appearance, 600, 1300, 'home background')
print('PASS: home screen visible and full-size without network or login')
