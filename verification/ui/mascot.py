import tempfile

from driver import Shot, by_id
from profile import rep_calls
from recording import frames

BASE_ARGS = ['-uiVerifySignedIn', 'onboarded', '-uiVerifyShellFeed', 'none']
LEVEL_ARGS = [*BASE_ARGS, '-uiVerifyRepDelayMs', '5000']
DEPS = ['src/features/reputation/', 'src/features/home/HomeScreen.tsx', 'src/ui/MascotStage.tsx', 'src/ui/Mascot.tsx',
        'src/ui/MascotWear.tsx', 'src/lib/i18n/locales/reputation/', 'src/app/(tabs)/bounty/',
        'verification/ui/mascot.py', 'verification/ui/recording.py']
POSES = {'calm': (96, 58, -8), 'urgent': (96, 58, -8), 'live': (86, 54, 2)}
FRAME_GAP_S = 0.03
MOVED = 40
MOVED_SHARE = 0.01
BOX_PAD = 14
GROWN = 'mascot-grown'


def stage(ui, state='calm'):
    return ui.element(f'home-stage-{state}', timeout=45)


def mascot_box(element, width, state='calm'):
    size, right, top = POSES[state]
    f = element['frame']
    return {'x': width - right - size - BOX_PAD, 'y': f['y'] + top - BOX_PAD,
            'width': size + 2 * BOX_PAD, 'height': size + 2 * BOX_PAD}


def tap_mascot(ui, element, state='calm'):
    size, right, top = POSES[state]
    width = ui.read()[0]['frame']['width']
    ui.tap_point(width - right - size / 2, element['frame']['y'] + top + size / 2)


def says(ui, text, state='calm', timeout=45):
    ui.wait(lambda items: (by_id(items, f'home-stage-{state}') or {}).get('AXLabel') == text or None,
            f'the stage never said {text!r}', timeout)


def moved_at(video, box, width):
    with tempfile.TemporaryDirectory() as tmp:
        shots = [(Shot(path, width), at) for path, at in frames(video, tmp, FRAME_GAP_S)]
        steps = []
        for (before, _), (after, at) in zip(shots, shots[1:]):
            a, b = list(before.pixels(box)), list(after.pixels(box))
            hits = sum(1 for p, q in zip(a, b) if max(abs(x - y) for x, y in zip(p, q)) > MOVED)
            if hits / max(1, len(a)) > MOVED_SHARE:
                steps.append(at)
    return steps


def assert_moment(ui, title_level, count, from_level, to_level, unlocked):
    ui.element(GROWN, timeout=20)
    name = ui.t(f'reputation.level.lv{title_level}') if title_level <= 5 else ui.t('reputation.level.grown')
    ui.labelled(ui.t('reputation.grown.title', name=name))
    progress = ui.settled(lambda items: by_id(items, 'mascot-grown-progress'), 'the sticker line never settled')
    assert progress.get('AXLabel') == ui.t('reputation.grown.progress', count=count, **{'from': from_level, 'to': to_level})
    items = ui.read()
    assert (by_id(items, 'mascot-grown-unlocked') is not None) == bool(unlocked), f'unlocked card vs {unlocked}'
    for level, accessory in unlocked:
        line = ui.t('reputation.grown.unlockedRow', level=level, name=ui.t(f'reputation.accessory.{accessory}'))
        assert [i for i in items if i.get('AXLabel') == line], f'{line} is not listed'


def seen_levels(ui, count=1, timeout=10):
    return [call['level'] for call in rep_calls(ui, 'markLevelSeen', count, timeout=timeout)]
