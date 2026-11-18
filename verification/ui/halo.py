from driver import glow


def assert_title_halo(ui, shot, f, name):
    if ui.appearance == 'dark':
        return
    background = shot.rgb(max(2, f['x'] - 12), f['y'] + f['height'] / 2)
    ink, light = glow(shot, f, background)
    print(f'{name}: background {background}, ink {ink}, halo {light}')
    assert ink > 200, f'{name}: title glyphs missing ({ink} ink pixels)'
    assert light > ink * 0.06, f'{name}: no white outline around the moment title ({light} light vs {ink} ink pixels)'
