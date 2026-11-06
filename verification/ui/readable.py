from driver import close, dominant


def wcag_ratio(a, b):
    def relative(rgb):
        c = [v / 255 for v in rgb[:3]]
        r, g, bl = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in c]
        return 0.2126 * r + 0.7152 * g + 0.0722 * bl
    high, low = sorted((relative(a), relative(b)), reverse=True)
    return (high + 0.05) / (low + 0.05)


# The strongest pixels of a label against its pill: anti-aliased edges would drag an average below the real contrast.
# The inset keeps the capsule's corners out, where the card behind would count as ink and pass an unreadable label.
def assert_label_reads(shot, frame, name, expected_fill, ratio=4.5, ink=40):
    inset = frame['height'] / 2
    core = {'x': frame['x'] + inset, 'width': frame['width'] - 2 * inset,
            'y': frame['y'] + 4, 'height': frame['height'] - 8}
    fill = dominant(shot, core)
    assert close(fill, expected_fill, 12), f'{name} fills with {fill}, not {expected_fill}: it is not selected'
    found = sorted((wcag_ratio(rgb, fill) for rgb in shot.pixels(core)), reverse=True)[ink]
    print(f'{name}: fill {fill}, label contrast {found:.2f}:1')
    assert found >= ratio, f'{name} is hard to read on its fill {fill}: {found:.2f}:1'
