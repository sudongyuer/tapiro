import ast

SHARED = [
    'src/ui/',
    'src/lib/',
    'src/app/_layout.tsx',
    'src/app/index.tsx',
    'src/debug/',
    'src/app/debug/',
    'modules/',
    'plugins/',
    'assets/',
    'app.json',
    'package.json',
    'bun.lock',
    'tsconfig.json',
    'verification/ui/driver.py',
    'verification/ui/run.py',
    'verification/ui/affected.py',
    'verification/ui/breaker.py',
    'verification/ui/recording.py',
    'verification/ui/swifttool.py',
    'verification/ui/frames.swift',
    'verification/ui/build.sh',
    'scripts/export-ui-strings.ts',
]
SMOKE = ['app_launches', 'sign_in_fixture', 'shell_tabs', 'home_one_card']
DEFAULT_LOCALE = 'zh-Hans'
MILESTONE_LOCALES = ['zh-Hans', 'en']
LANGUAGE_ORDER = ['zh-Hans', 'en', 'ms']


def parse_deps(source):
    for node in ast.parse(source).body:
        if isinstance(node, ast.Assign) and any(getattr(t, 'id', None) == 'DEPS' for t in node.targets):
            return list(ast.literal_eval(node.value))
    return None


def matches(path, prefix):
    return path == prefix or path.startswith(prefix)


def select(cases, changed, shared=SHARED):
    changed = sorted(set(changed))
    shared_hits = [path for path in changed if any(matches(path, prefix) for prefix in shared)]
    picked = {}
    for case, deps in cases.items():
        reasons = []
        if shared_hits:
            more = f' (+{len(shared_hits) - 3} more)' if len(shared_hits) > 3 else ''
            reasons.append(f"shared: {', '.join(shared_hits[:3])}{more}")
        if deps is None:
            reasons.append('declares no DEPS')
        own = f'verification/ui/cases/{case}.py'
        if own in changed:
            reasons.append(f'own file: {own}')
        for prefix in deps or []:
            hits = [path for path in changed if matches(path, prefix)]
            if hits:
                reasons.append(f'{prefix}: {hits[0]}' + (f' (+{len(hits) - 1} more)' if len(hits) > 1 else ''))
        if reasons:
            picked[case] = reasons
    return picked


def run_locales(declared, with_declared):
    if with_declared:
        wanted = {*MILESTONE_LOCALES, *declared}
        return sorted(wanted, key=lambda l: (LANGUAGE_ORDER.index(l) if l in LANGUAGE_ORDER else len(LANGUAGE_ORDER), l))
    return [DEFAULT_LOCALE] if DEFAULT_LOCALE in declared else declared[:1]
