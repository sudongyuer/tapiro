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
    'verification/ui/heal.py',
    'verification/ui/latency.py',
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


DECLARED = ('DEPS', 'SCENE', 'LOCALES', 'ARGS', 'BUDGET', 'TIME_ZONE', 'LOCAL_HOURS')
STRING_LISTS = ('DEPS', 'LOCALES', 'ARGS')


def parse_declarations(source):
    values = {}
    for node in ast.parse(source).body:
        if not isinstance(node, ast.Assign):
            continue
        for target in node.targets:
            name = getattr(target, 'id', None)
            if name not in DECLARED:
                continue
            try:
                value = ast.literal_eval(node.value)
            except ValueError:
                raise ValueError(f'{name} must be a literal the runner can read without running the case') from None
            if name in STRING_LISTS and not (isinstance(value, list) and all(isinstance(v, str) for v in value)):
                raise ValueError(f'{name} must be a list of strings')
            if name == 'TIME_ZONE' and not isinstance(value, str):
                raise ValueError('TIME_ZONE must be a zone name string')
            if name == 'LOCAL_HOURS' and not (isinstance(value, list) and value
                                              and all(isinstance(v, int) and 0 <= v <= 23 for v in value)):
                raise ValueError('LOCAL_HOURS must be a list of hours 0-23')
            values[name] = value
    if 'TIME_ZONE' in values and 'LOCAL_HOURS' in values:
        raise ValueError('declare TIME_ZONE or LOCAL_HOURS, not both')
    return values


def parse_deps(source):
    deps = parse_declarations(source).get('DEPS')
    return None if deps is None else list(deps)


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
